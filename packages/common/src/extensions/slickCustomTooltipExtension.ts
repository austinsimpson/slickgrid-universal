import { CancellablePromiseWrapper, Column, CustomTooltipOption, Formatter, GridOption, SlickDataView, SlickEventData, SlickEventHandler, SlickGrid, SlickNamespace } from '../interfaces/index';
import { cancellablePromise, CancelledException, getHtmlElementOffset, sanitizeTextByAvailableSanitizer } from '../services/utilities';
import { SharedService } from '../services/shared.service';
import { Observable, RxJsFacade, Subscription } from '../services/rxjsFacade';
import { calculateAvailableSpace } from '../services/domUtilities';

// using external SlickGrid JS libraries
declare const Slick: SlickNamespace;

/**
 * A plugin to add Custom Tooltip when hovering a cell, it subscribes to the cell "onMouseEnter" and "onMouseLeave" events.
 * The "customTooltip" is defined in the Column Definition OR Grid Options (the first found will have priority over the second)
 * To specify a tooltip when hovering a cell, extend the column definition like so:
 *
 * Available plugin options (same options are available in both column definition and/or grid options)
 * Example 1  - via Column Definition
 *  this.columnDefinitions = [
 *    {
 *      id: "action", name: "Action", field: "action", formatter: fakeButtonFormatter,
 *      customTooltip: {
 *        formatter: tooltipTaskFormatter,
 *        usabilityOverride: (args) => !!(args.dataContext.id % 2) // show it only every second row
 *      }
 *    }
 *  ];
 *
 *  OR Example 2 - via Grid Options (for all columns), NOTE: the column definition tooltip options will win over the options defined in the grid options
 *  this.gridOptions = {
 *    enableCellNavigation: true,
 *    customTooltip: {
 *    },
 *  };
 */
export class SlickCustomTooltip {
  protected _addonOptions?: CustomTooltipOption;
  protected _cellAddonOptions?: CustomTooltipOption;
  protected _cellNodeElm?: HTMLDivElement;
  protected _cancellablePromise?: CancellablePromiseWrapper;
  protected _observable$?: Subscription;
  protected _tooltipElm?: HTMLDivElement;
  protected _defaultOptions = {
    className: 'slick-custom-tooltip',
    offsetLeft: 0,
    offsetRight: 0,
    offsetTopBottom: 4,
    hideArrow: false,
  } as CustomTooltipOption;
  protected _grid!: SlickGrid;
  protected _eventHandler: SlickEventHandler;

  constructor(protected readonly sharedService: SharedService, protected rxjs?: RxJsFacade) {
    this._eventHandler = new Slick.EventHandler();
  }

  get addonOptions(): CustomTooltipOption | undefined {
    return this._addonOptions;
  }

  get cellAddonOptions(): CustomTooltipOption | undefined {
    return this._cellAddonOptions;
  }

  get className(): string {
    return this._cellAddonOptions?.className ?? 'slick-custom-tooltip';
  }
  get dataView(): SlickDataView {
    return this._grid.getData<SlickDataView>() || {};
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  get gridOptions(): GridOption {
    return this._grid.getOptions() || {};
  }

  /** Getter for the grid uid */
  get gridUid(): string {
    return this._grid.getUID() || '';
  }
  get gridUidSelector(): string {
    return this.gridUid ? `.${this.gridUid}` : '';
  }

  get tooltipElm(): HTMLDivElement | undefined {
    return this._tooltipElm;
  }

  addRxJsResource(rxjs: RxJsFacade) {
    this.rxjs = rxjs;
  }

  init(grid: SlickGrid) {
    this._grid = grid;
    this._addonOptions = { ...this._defaultOptions, ...(this.sharedService?.gridOptions?.customTooltip) } as CustomTooltipOption;
    this._eventHandler
      .subscribe(grid.onMouseEnter, this.handleOnMouseEnter.bind(this) as unknown as EventListener)
      .subscribe(grid.onHeaderMouseEnter, this.handleOnHeaderMouseEnter.bind(this) as unknown as EventListener)
      .subscribe(grid.onMouseLeave, this.hideTooltip.bind(this) as EventListener)
      .subscribe(grid.onHeaderMouseLeave, this.hideTooltip.bind(this) as EventListener);
  }

  dispose() {
    // hide (remove) any tooltip and unsubscribe from all events
    this.hideTooltip();
    this._eventHandler.unsubscribeAll();
  }

  /**
   * hide (remove) tooltip from the DOM, it will also remove it from the DOM and also cancel any pending requests (as mentioned below).
   * When using async process, it will also cancel any opened Promise/Observable that might still be pending.
   */
  hideTooltip() {
    this._cancellablePromise?.cancel();
    this._observable$?.unsubscribe();
    const prevTooltip = document.body.querySelector(`.${this.className}${this.gridUidSelector}`);
    prevTooltip?.remove();
  }

  setOptions(newOptions: CustomTooltipOption) {
    this._addonOptions = { ...this._addonOptions, ...newOptions } as CustomTooltipOption;
  }

  // --
  // protected functions
  // ---------------------

  /**
   *  hide any prior tooltip & merge the new result with the item `dataContext` under a `__params` property (unless a new prop name is provided)
   * finally render the tooltip with the `asyncPostFormatter` formatter
   */
  protected asyncProcessCallback(asyncResult: any, cell: { row: number, cell: number }, value: any, columnDef: Column, dataContext: any) {
    this.hideTooltip();
    const itemWithAsyncData = { ...dataContext, [this.addonOptions?.asyncParamsPropName ?? '__params']: asyncResult };
    this.renderTooltipFormatter(this._cellAddonOptions!.asyncPostFormatter, cell, value, columnDef, itemWithAsyncData);
  }

  /**
   * clear the "title" attribute from the grid div text content so that it won't show also as a 2nd browser tooltip
   * note: the reason we can do delete it completely is because we always re-execute the formatter whenever we hover the tooltip and so we have a fresh title attribute each time to use
   */
  protected clearTitleAttribute(inputTitleElm?: Element | null) {
    // the title attribute might be directly on the slick-cell element (e.g. AutoTooltip plugin)
    // OR in a child element (most commonly as a custom formatter)
    const titleElm = inputTitleElm || this._cellNodeElm?.hasAttribute('title') ? this._cellNodeElm : this._cellNodeElm?.querySelector('[title]');
    titleElm?.setAttribute('title', '');
  }

  /**
     * Handle mouse entering grid cell header to show tooltip.
     * @param {jQuery.Event} e - The event
     */
  protected handleOnHeaderMouseEnter(e: SlickEventData, args: any) {
    // before doing anything, let's remove any previous tooltip before
    // and cancel any opened Promise/Observable when using async
    this.hideTooltip();

    const cell = {
      row: -1, // negative row to avoid pulling any dataContext while rendering
      cell: this._grid.getColumns().findIndex((col) => (args?.column?.id ?? '') === col.id)
    };
    const columnDef = args.column;
    const item = {};

    // run the override function (when defined), if the result is false it won't go further
    if (!args) {
      args = {};
    }
    args.cell = cell.cell;
    args.row = cell.row;
    args.columnDef = columnDef;
    args.dataContext = item;
    args.grid = this._grid;
    if (typeof this._cellAddonOptions?.usabilityOverride === 'function' && !this._cellAddonOptions.usabilityOverride(args)) {
      return;
    }

    if (columnDef && e.target) {
      this._cellAddonOptions = { ...this._addonOptions, ...(columnDef?.customTooltip) } as CustomTooltipOption;
      this._cellNodeElm = (e.target as HTMLDivElement).closest('.slick-header-column') as HTMLDivElement;

      this.executeTooltipOpenDelayWhenProvided(() => {
        if (this._cellAddonOptions?.useRegularTooltip || !this._cellAddonOptions?.headerFormatter) {
          this.renderRegularTooltip(columnDef.name, cell, null, columnDef, item);
        } else if (this._cellNodeElm && typeof this._cellAddonOptions.headerFormatter === 'function') {
          this.renderTooltipFormatter(this._cellAddonOptions.headerFormatter, cell, null, columnDef, item);
        }
      }, this._cellAddonOptions?.tooltipDelay);
    }
  }

  protected async handleOnMouseEnter(e: SlickEventData) {
    // before doing anything, let's remove any previous tooltip before
    // and cancel any opened Promise/Observable when using async
    this.hideTooltip();

    if (this._grid && e) {
      this.executeTooltipOpenDelayWhenProvided(() => {
        const cell = this._grid.getCellFromEvent(e);
        if (cell) {
          const item = this.dataView.getItem(cell.row);
          const columnDef = this._grid.getColumns()[cell.cell];
          this._cellNodeElm = this._grid.getCellNode(cell.row, cell.cell) as HTMLDivElement;

          if (item && columnDef) {
            this._cellAddonOptions = { ...this._addonOptions, ...(columnDef?.customTooltip) } as CustomTooltipOption;

            if (typeof this._cellAddonOptions?.usabilityOverride === 'function' && !this._cellAddonOptions.usabilityOverride({ cell: cell.cell, row: cell.row, dataContext: item, column: columnDef, grid: this._grid })) {
              return;
            }

            const value = item.hasOwnProperty(columnDef.field) ? item[columnDef.field] : null;

            if (this._cellAddonOptions.useRegularTooltip || !this._cellAddonOptions?.formatter) {
              this.renderRegularTooltip(columnDef.formatter, cell, value, columnDef, item);
            } else {
              if (!this._cellAddonOptions.useRegularTooltip && typeof this._cellAddonOptions?.formatter === 'function') {
                this.renderTooltipFormatter(this._cellAddonOptions.formatter, cell, value, columnDef, item);
              }
              if (typeof this._cellAddonOptions?.asyncProcess === 'function') {
                const asyncProcess = this._cellAddonOptions.asyncProcess(cell.row, cell.cell, value, columnDef, item, this._grid);
                if (!this._cellAddonOptions.asyncPostFormatter) {
                  throw new Error(`[Slickgrid-Universal] when using "asyncProcess", you must also provide an "asyncPostFormatter" formatter`);
                }

                if (asyncProcess instanceof Promise) {
                  // create a new cancellable promise which will resolve, unless it's cancelled, with the udpated `dataContext` object that includes the `__params`
                  this._cancellablePromise = cancellablePromise(asyncProcess);
                  this._cancellablePromise.promise
                    .then((asyncResult: any) => this.asyncProcessCallback(asyncResult, cell, value, columnDef, item))
                    .catch((error: Error) => {
                      // we will throw back any errors, unless it's a cancelled promise which in that case will be disregarded (thrown by the promise wrapper cancel() call)
                      if (!(error instanceof CancelledException)) {
                        throw error;
                      }
                    });
                } else if (this.rxjs?.isObservable(asyncProcess)) {
                  const rxjs = this.rxjs as RxJsFacade;
                  this._observable$ = (asyncProcess as unknown as Observable<any>)
                    .pipe(
                      // use `switchMap` so that it cancels the previous subscription and a new observable is subscribed
                      rxjs.switchMap((asyncResult) => this.asyncProcessCallback(asyncResult, cell, value, columnDef, item))
                    ).subscribe();
                }
              }
            }
          }
        }
      }, this._cellAddonOptions?.tooltipDelay);
    }
  }

  executeTooltipOpenDelayWhenProvided(fn: any, delay?: number) {
    if (typeof delay === 'number') {
      this.hideTooltip();
      setTimeout(() => {
        this.hideTooltip();
        fn.call(this);
      }, delay);
    } else {
      fn.call(this);
    }
  }

  /**
   * Parse the Custom Formatter (when provided) or return directly the text when it is already a string.
   * We will also sanitize the text in both cases before returning it so that it can be used safely.
   */
  protected parseFormatter(formatterOrText: Formatter | string | undefined, cell: { row: number; cell: number; }, value: any, columnDef: Column, item: unknown): string {
    if (typeof formatterOrText === 'function') {
      const tooltipText = formatterOrText(cell.row, cell.cell, value, columnDef, item, this._grid);
      const formatterText = ((typeof tooltipText === 'object' && tooltipText.text) ? tooltipText.text : typeof tooltipText === 'string' ? tooltipText : '');
      return sanitizeTextByAvailableSanitizer(this.gridOptions, formatterText);
    } else if (typeof formatterOrText === 'string') {
      return sanitizeTextByAvailableSanitizer(this.gridOptions, formatterOrText);
    }
    return '';
  }

  /**
   * Parse the cell formatter and assume it might be html
   * then create a temporary html element to easily retrieve the first [title=""] attribute text content
   * also clear the "title" attribute from the grid div text content so that it won't show also as a 2nd browser tooltip
   */
  protected renderRegularTooltip(formatterOrText: Formatter | string | undefined, cell: { row: number; cell: number; }, value: any, columnDef: Column, item: any) {
    const tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = this.parseFormatter(formatterOrText, cell, value, columnDef, item);

    let tmpTitleElm;
    if (this._cellAddonOptions?.useRegularTooltipFromFormatterOnly) {
      tmpTitleElm = tmpDiv.querySelector('[title]');
    } else {
      tmpTitleElm = this._cellNodeElm?.getAttribute('title') ? this._cellNodeElm : tmpDiv.querySelector<HTMLDivElement>('[title]');
    }
    const tooltipText = tmpTitleElm?.getAttribute('title') ?? '';
    if (tooltipText !== '') {
      this.renderTooltipFormatter(formatterOrText, cell, value, columnDef, item, tooltipText);
    }

    // also clear any "title" attribute to avoid showing a 2nd browser tooltip
    this.clearTitleAttribute(tmpTitleElm);
  }

  protected renderTooltipFormatter(formatter: Formatter | string | undefined, cell: { row: number; cell: number; }, value: any, columnDef: Column, item: unknown, tooltipText?: string) {
    // create the tooltip DOM element with the text returned by the Formatter
    this._tooltipElm = document.createElement('div');
    this._tooltipElm.className = `${this.className} ${this.gridUid}`;
    this._tooltipElm.classList.add('l' + cell.cell);
    this._tooltipElm.classList.add('r' + cell.cell);
    let outputText = tooltipText || this.parseFormatter(formatter, cell, value, columnDef, item) || '';
    outputText = (this._cellAddonOptions?.tooltipTextMaxLength && outputText.length > this._cellAddonOptions.tooltipTextMaxLength) ? outputText.substr(0, this._cellAddonOptions.tooltipTextMaxLength) + '...' : outputText;
    if (!tooltipText || this._cellAddonOptions?.renderRegularTooltipAsHtml) {
      this._tooltipElm.innerHTML = sanitizeTextByAvailableSanitizer(this.gridOptions, outputText);
    } else {
      this._tooltipElm.textContent = outputText || '';
      this._tooltipElm.style.whiteSpace = 'pre'; // use `pre` so that sequences of white space are preserved
    }

    // optional max height/width of the tooltip container
    if (this._cellAddonOptions?.maxHeight) {
      this._tooltipElm.style.maxHeight = `${this._cellAddonOptions.maxHeight}px`;
    }
    if (this._cellAddonOptions?.maxWidth) {
      this._tooltipElm.style.maxWidth = `${this._cellAddonOptions.maxWidth}px`;
    }

    // append the new tooltip to the body & reposition it
    document.body.appendChild(this._tooltipElm);

    // reposition the tooltip on top of the cell that triggered the mouse over event
    this.reposition(cell);

    // user could optionally hide the tooltip arrow (we can simply update the CSS constiables, that's the only way we have to update CSS pseudo)
    if (!this._cellAddonOptions?.hideArrow) {
      this._tooltipElm.classList.add('tooltip-arrow');
    }

    // also clear any "title" attribute to avoid showing a 2nd browser tooltip
    this.clearTitleAttribute();
  }

  /**
   * Reposition the Tooltip to be top-left position over the cell.
   * By default we use an "auto" mode which will allow to position the Tooltip to the best logical position in the window, also when we mention position, we are talking about the relative position against the grid cell.
   * We can assume that in 80% of the time the default position is top-right, the default is "auto" but we can also override it and use a specific position.
   * Most of the time positioning of the tooltip will be to the "top-right" of the cell is ok but if our column is completely on the right side then we'll want to change the position to "left" align.
   * Same goes for the top/bottom position, Most of the time positioning the tooltip to the "top" but if we are hovering a cell at the top of the grid and there's no room to display it then we might need to reposition to "bottom" instead.
   */
  protected reposition(cell: { row: number; cell: number; }) {
    if (this._tooltipElm) {
      this._cellNodeElm = this._cellNodeElm || this._grid.getCellNode(cell.row, cell.cell) as HTMLDivElement;
      const cellPosition = getHtmlElementOffset(this._cellNodeElm);
      const containerWidth = this._cellNodeElm.offsetWidth;
      const calculatedTooltipHeight = this._tooltipElm.getBoundingClientRect().height;
      const calculatedTooltipWidth = this._tooltipElm.getBoundingClientRect().width;
      const calculatedBodyWidth = document.body.offsetWidth || window.innerWidth;

      // first calculate the default (top/left) position
      let newPositionTop = cellPosition.top - this._tooltipElm.offsetHeight - (this._cellAddonOptions?.offsetTopBottom ?? 0);
      let newPositionLeft = (cellPosition?.left ?? 0) - (this._cellAddonOptions?.offsetLeft ?? 0);

      // user could explicitely use a "left" position (when user knows his column is completely on the right)
      // or when using "auto" and we detect not enough available space then we'll position to the "left" of the cell
      const position = this._cellAddonOptions?.position ?? 'auto';
      if (position === 'left-align' || (position === 'auto' && (newPositionLeft + calculatedTooltipWidth) > calculatedBodyWidth)) {
        newPositionLeft -= (calculatedTooltipWidth - containerWidth - (this._cellAddonOptions?.offsetRight ?? 0));
        this._tooltipElm.classList.remove('arrow-left');
        this._tooltipElm.classList.add('arrow-right');
      } else {
        this._tooltipElm.classList.add('arrow-left');
        this._tooltipElm.classList.remove('arrow-right');
      }

      // do the same calculation/reposition with top/bottom (default is top of the cell or in other word starting from the cell going down)
      if (position === 'bottom' || (position === 'auto' && calculatedTooltipHeight > calculateAvailableSpace(this._cellNodeElm).top)) {
        newPositionTop = cellPosition.top + (this.gridOptions.rowHeight ?? 0) + (this._cellAddonOptions?.offsetTopBottom ?? 0);
        this._tooltipElm.classList.remove('arrow-down');
        this._tooltipElm.classList.add('arrow-up');
      } else {
        this._tooltipElm.classList.add('arrow-down');
        this._tooltipElm.classList.remove('arrow-up');
      }

      // reposition the tooltip over the cell (90% of the time this will end up using a position on the "right" of the cell)
      this._tooltipElm.style.top = `${newPositionTop}px`;
      this._tooltipElm.style.left = `${newPositionLeft}px`;
    }
  }
}
