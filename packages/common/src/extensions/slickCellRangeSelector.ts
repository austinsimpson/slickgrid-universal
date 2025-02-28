import { deepMerge } from '@slickgrid-universal/utils';

import {
  CellRange,
  CellRangeSelectorOption,
  DOMMouseOrTouchEvent,
  DragPosition,
  DragRange,
  GridOption,
  MouseOffsetViewport,
  OnScrollEventArgs,
  SlickEventData,
  SlickEventHandler,
  SlickGrid,
  SlickNamespace
} from '../interfaces/index';
import { emptyElement, getHtmlElementOffset, } from '../services/domUtilities';
import { SlickCellRangeDecorator } from './index';

// using external SlickGrid JS libraries
declare const Slick: SlickNamespace;
export class SlickCellRangeSelector {
  protected _activeCanvas?: HTMLElement;
  protected _addonOptions!: CellRangeSelectorOption;
  protected _currentlySelectedRange: DragRange | null = null;
  protected _canvas!: HTMLElement;
  protected _decorator!: SlickCellRangeDecorator;
  protected _dragging = false;
  protected _eventHandler: SlickEventHandler;
  protected _grid!: SlickGrid;
  protected _gridOptions!: GridOption;
  protected _gridUid = '';

  // Frozen row & column constiables
  protected _columnOffset = 0;
  protected _rowOffset = 0;
  protected _isRightCanvas = false;
  protected _isBottomCanvas = false;

  // autoScroll related constiables
  protected _activeViewport!: HTMLElement;
  protected _autoScrollTimerId?: NodeJS.Timeout;
  protected _draggingMouseOffset!: MouseOffsetViewport;
  protected _moveDistanceForOneCell!: { x: number; y: number; };
  protected _xDelayForNextCell = 0;
  protected _yDelayForNextCell = 0;
  protected _viewportHeight = 0;
  protected _viewportWidth = 0;

  // Scrollings
  protected _scrollLeft = 0;
  protected _scrollTop = 0;
  protected _defaults = {
    autoScroll: true,
    minIntervalToShowNextCell: 30,
    maxIntervalToShowNextCell: 600, // better to a multiple of minIntervalToShowNextCell
    accelerateInterval: 5,          // increase 5ms when cursor 1px outside the viewport.
    selectionCss: {
      border: '2px dashed blue'
    }
  } as CellRangeSelectorOption;
  pluginName: 'CellRangeSelector' = 'CellRangeSelector' as const;
  onBeforeCellRangeSelected = new Slick.Event<{ row: number; cell: number; }>();
  onCellRangeSelecting = new Slick.Event<{ range: CellRange; }>();
  onCellRangeSelected = new Slick.Event<{ range: CellRange; }>();

  constructor(options?: Partial<CellRangeSelectorOption>) {
    this._eventHandler = new Slick.EventHandler();
    this._addonOptions = deepMerge(this._defaults, options);
  }

  get addonOptions() {
    return this._addonOptions;
  }

  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  /** Getter for the grid uid */
  get gridUid(): string {
    return this._gridUid || (this._grid?.getUID() ?? '');
  }
  get gridUidSelector(): string {
    return this.gridUid ? `.${this.gridUid}` : '';
  }

  init(grid: SlickGrid) {
    this._grid = grid;
    this._decorator = this._addonOptions.cellDecorator || new SlickCellRangeDecorator(grid, this._addonOptions);
    this._canvas = grid.getCanvasNode();
    this._gridOptions = grid.getOptions();
    this._gridUid = grid.getUID();

    this._eventHandler
      .subscribe(this._grid.onDrag, this.handleDrag.bind(this) as EventListener)
      .subscribe(this._grid.onDragInit, this.handleDragInit.bind(this) as EventListener)
      .subscribe(this._grid.onDragStart, this.handleDragStart.bind(this) as EventListener)
      .subscribe(this._grid.onDragEnd, this.handleDragEnd.bind(this) as EventListener)
      .subscribe(this._grid.onScroll, this.handleScroll.bind(this) as EventListener);
  }

  destroy() {
    this.dispose();
  }

  /** Dispose the plugin. */
  dispose() {
    this._eventHandler?.unsubscribeAll();
    emptyElement(this._activeCanvas);
    emptyElement(this._canvas);
    this._decorator?.dispose();
    this.stopIntervalTimer();
  }

  getCellDecorator() {
    return this._decorator;
  }

  getCurrentRange() {
    return this._currentlySelectedRange;
  }

  getMouseOffsetViewport(e: SlickEventData, dd: DragPosition): MouseOffsetViewport {
    const targetEvent: MouseEvent | Touch = (e as TouchEvent)?.touches?.[0] ?? e;
    const viewportLeft = this._activeViewport.scrollLeft;
    const viewportTop = this._activeViewport.scrollTop;
    const viewportRight = viewportLeft + this._viewportWidth;
    const viewportBottom = viewportTop + this._viewportHeight;

    const viewportOffset = getHtmlElementOffset(this._activeViewport);
    const viewportOffsetLeft = viewportOffset?.left ?? 0;
    const viewportOffsetTop = viewportOffset?.top ?? 0;
    const viewportOffsetRight = viewportOffsetLeft + this._viewportWidth;
    const viewportOffsetBottom = viewportOffsetTop + this._viewportHeight;

    const result = {
      e,
      dd,
      viewport: {
        left: viewportLeft, top: viewportTop, right: viewportRight, bottom: viewportBottom,
        offset: { left: viewportOffsetLeft, top: viewportOffsetTop, right: viewportOffsetRight, bottom: viewportOffsetBottom }
      },
      // Consider the viewport as the origin, the `offset` is based on the coordinate system:
      // the cursor is on the viewport's left/bottom when it is less than 0, and on the right/top when greater than 0.
      offset: { x: 0, y: 0 },
      isOutsideViewport: false
    };

    // ... horizontal
    if (targetEvent.pageX < viewportOffsetLeft) {
      result.offset.x = targetEvent.pageX - viewportOffsetLeft;
    } else if (targetEvent.pageX > viewportOffsetRight) {
      result.offset.x = targetEvent.pageX - viewportOffsetRight;
    }
    // ... vertical
    if (targetEvent.pageY < viewportOffsetTop) {
      result.offset.y = viewportOffsetTop - targetEvent.pageY;
    } else if (targetEvent.pageY > viewportOffsetBottom) {
      result.offset.y = viewportOffsetBottom - targetEvent.pageY;
    }
    result.isOutsideViewport = !!result.offset.x || !!result.offset.y;
    return result;
  }

  stopIntervalTimer() {
    if (this._autoScrollTimerId) {
      clearInterval(this._autoScrollTimerId);
      this._autoScrollTimerId = undefined;
    }
  }

  //
  // protected functions
  // ---------------------

  protected handleDrag(e: SlickEventData, dd: DragPosition) {
    if (!this._dragging && !this._gridOptions.enableRowMoveManager) {
      return;
    }
    if (!this._gridOptions.enableRowMoveManager) {
      e.stopImmediatePropagation();
    }

    if (this.addonOptions.autoScroll) {
      this._draggingMouseOffset = this.getMouseOffsetViewport(e, dd);
      if (this._draggingMouseOffset.isOutsideViewport) {
        return this.handleDragOutsideViewport();
      }
    }
    this.stopIntervalTimer();
    this.handleDragTo(e, dd);
  }

  protected handleDragOutsideViewport() {
    this._xDelayForNextCell = this.addonOptions.maxIntervalToShowNextCell - Math.abs(this._draggingMouseOffset.offset.x) * this.addonOptions.accelerateInterval;
    this._yDelayForNextCell = this.addonOptions.maxIntervalToShowNextCell - Math.abs(this._draggingMouseOffset.offset.y) * this.addonOptions.accelerateInterval;

    // only one timer is created to handle the case that cursor outside the viewport
    if (!this._autoScrollTimerId) {
      let xTotalDelay = 0;
      let yTotalDelay = 0;

      this._autoScrollTimerId = setInterval(() => {
        let xNeedUpdate = false;
        let yNeedUpdate = false;
        // ... horizontal
        if (this._draggingMouseOffset.offset.x) {
          xTotalDelay += this.addonOptions.minIntervalToShowNextCell;
          xNeedUpdate = xTotalDelay >= this._xDelayForNextCell;
        } else {
          xTotalDelay = 0;
        }
        // ... vertical
        if (this._draggingMouseOffset.offset.y) {
          yTotalDelay += this.addonOptions.minIntervalToShowNextCell;
          yNeedUpdate = yTotalDelay >= this._yDelayForNextCell;
        } else {
          yTotalDelay = 0;
        }
        if (xNeedUpdate || yNeedUpdate) {
          if (xNeedUpdate) {
            xTotalDelay = 0;
          }
          if (yNeedUpdate) {
            yTotalDelay = 0;
          }
          this.handleDragToNewPosition(xNeedUpdate, yNeedUpdate);
        }
      }, this.addonOptions.minIntervalToShowNextCell);
    }
  }

  protected handleDragToNewPosition(xNeedUpdate: boolean, yNeedUpdate: boolean) {
    let pageX = this._draggingMouseOffset.e.pageX;
    let pageY = this._draggingMouseOffset.e.pageY;
    const mouseOffsetX = this._draggingMouseOffset.offset.x;
    const mouseOffsetY = this._draggingMouseOffset.offset.y;
    const viewportOffset = this._draggingMouseOffset.viewport.offset;
    // ... horizontal
    if (xNeedUpdate && mouseOffsetX) {
      if (mouseOffsetX > 0) {
        pageX = viewportOffset.right + this._moveDistanceForOneCell.x;
      } else {
        pageX = viewportOffset.left - this._moveDistanceForOneCell.x;
      }
    }
    // ... vertical
    if (yNeedUpdate && mouseOffsetY) {
      if (mouseOffsetY > 0) {
        pageY = viewportOffset.top - this._moveDistanceForOneCell.y;
      } else {
        pageY = viewportOffset.bottom + this._moveDistanceForOneCell.y;
      }
    }
    this.handleDragTo({ pageX, pageY }, this._draggingMouseOffset.dd);
  }

  protected handleDragTo(e: { pageX: number; pageY: number; }, dd: DragPosition) {
    const targetEvent: MouseEvent | Touch = (e as unknown as TouchEvent)?.touches?.[0] ?? e;
    const end = this._grid.getCellFromPoint(
      targetEvent.pageX - (getHtmlElementOffset(this._activeCanvas)?.left ?? 0) + this._columnOffset,
      targetEvent.pageY - (getHtmlElementOffset(this._activeCanvas)?.top ?? 0) + this._rowOffset
    );

    if (end !== undefined) {
      // ... frozen column(s),
      if (this._gridOptions.frozenColumn! >= 0 && ((!this._isRightCanvas && (end.cell > this._gridOptions.frozenColumn!)) || (this._isRightCanvas && (end.cell <= this._gridOptions.frozenColumn!)))) {
        return;
      }

      // ... or frozen row(s)
      if (this._gridOptions.frozenRow! >= 0 && ((!this._isBottomCanvas && (end.row >= this._gridOptions.frozenRow!)) || (this._isBottomCanvas && (end.row < this._gridOptions.frozenRow!)))) {
        return;
      }

      // scrolling the viewport to display the target `end` cell if it is not fully displayed
      if (this.addonOptions.autoScroll && this._draggingMouseOffset) {
        const endCellBox = this._grid.getCellNodeBox(end.row, end.cell);
        if (endCellBox) {
          const viewport = this._draggingMouseOffset.viewport;
          if (endCellBox.left < viewport.left || endCellBox.right > viewport.right || endCellBox.top < viewport.top || endCellBox.bottom > viewport.bottom) {
            this._grid.scrollCellIntoView(end.row, end.cell);
          }
        }
      }

      // ... or regular grid (without any frozen options)
      if (!this._grid.canCellBeSelected(end.row, end.cell)) {
        return;
      }

      if (dd?.range) {
        dd.range.end = end;
        const range = new Slick.Range(dd.range.start.row, dd.range.start.cell, end.row, end.cell);
        this._decorator.show(range);
        this.onCellRangeSelecting.notify({ range });
      }
    }
  }

  protected handleDragEnd(e: any, dd: DragPosition) {
    if (this._dragging) {
      this._dragging = false;
      e.stopImmediatePropagation();

      this.stopIntervalTimer();
      this._decorator.hide();
      this.onCellRangeSelected.notify({
        range: new Slick.Range(dd.range.start.row, dd.range.start.cell, dd.range.end.row, dd.range.end.cell)
      });
    }
  }

  protected handleDragInit(e: any) {
    // Set the active canvas node because the decorator needs to append its
    // box to the correct canvas
    this._activeCanvas = this._grid.getActiveCanvasNode(e);
    this._activeViewport = this._grid.getActiveViewportNode(e);

    const scrollbarDimensions = this._grid.getDisplayedScrollbarDimensions();
    this._viewportWidth = this._activeViewport.offsetWidth - scrollbarDimensions.width;
    this._viewportHeight = this._activeViewport.offsetHeight - scrollbarDimensions.height;

    this._moveDistanceForOneCell = {
      x: this._grid.getAbsoluteColumnMinWidth() / 2,
      y: this._gridOptions.rowHeight! / 2
    };

    this._rowOffset = 0;
    this._columnOffset = 0;
    this._isBottomCanvas = this._activeCanvas.classList.contains('grid-canvas-bottom');

    if (this._gridOptions.frozenRow! > -1 && this._isBottomCanvas) {
      const canvasSelector = `${this.gridUidSelector} .grid-canvas-${this._gridOptions.frozenBottom ? 'bottom' : 'top'}`;
      this._rowOffset = document.querySelector(canvasSelector)?.clientHeight ?? 0;
    }

    this._isRightCanvas = this._activeCanvas.classList.contains('grid-canvas-right');

    if (this._gridOptions.frozenColumn! > -1 && this._isRightCanvas) {
      this._columnOffset = document.querySelector(`${this.gridUidSelector} .grid-canvas-left`)?.clientWidth ?? 0;
    }

    // prevent the grid from cancelling drag'n'drop by default
    e.stopImmediatePropagation();
  }

  protected handleDragStart(e: DOMMouseOrTouchEvent<HTMLDivElement>, dd: DragPosition) {
    const cellObj = this._grid.getCellFromEvent(e);
    if (cellObj && this.onBeforeCellRangeSelected.notify(cellObj) !== false && this._grid.canCellBeSelected(cellObj.row, cellObj.cell)) {
      this._dragging = true;
      e.stopImmediatePropagation();
    }

    if (!this._dragging) {
      return;
    }

    this._grid.focus();

    let startX = dd.startX - (getHtmlElementOffset(this._canvas)?.left ?? 0);
    if (this._gridOptions.frozenColumn! >= 0 && this._isRightCanvas) {
      startX += this._scrollLeft;
    }

    let startY = dd.startY - (getHtmlElementOffset(this._canvas)?.top ?? 0);
    if (this._gridOptions.frozenRow! >= 0 && this._isBottomCanvas) {
      startY += this._scrollTop;
    }

    const start = this._grid.getCellFromPoint(startX, startY);
    dd.range = { start, end: {} };
    this._currentlySelectedRange = dd.range;
    return this._decorator.show(new Slick.Range(start.row, start.cell));
  }

  protected handleScroll(_e: DOMMouseOrTouchEvent<HTMLDivElement>, args: OnScrollEventArgs) {
    this._scrollTop = args.scrollTop;
    this._scrollLeft = args.scrollLeft;
  }
}