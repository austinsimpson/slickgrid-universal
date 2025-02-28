import { KeyCode } from '../enums/index';
import {
  CellRange,
  Column,
  ExcelCopyBufferOption,
  ExternalCopyClipCommand,
  SlickEventHandler,
  SlickGrid,
  SlickNamespace,
} from '../interfaces/index';
import { createDomElement } from '../services/domUtilities';

// using external SlickGrid JS libraries
declare const Slick: SlickNamespace;
const CLEAR_COPY_SELECTION_DELAY = 2000;
const CLIPBOARD_PASTE_DELAY = 100;

/*
  This manager enables users to copy/paste data from/to an external Spreadsheet application
  such as MS-Excel® or OpenOffice-Spreadsheet.

  Since it is not possible to access directly the clipboard in javascript, the plugin uses
  a trick to do it's job. After detecting the keystroke, we dynamically create a textarea
  where the browser copies/pastes the serialized data.
*/
export class SlickCellExternalCopyManager {
  protected _addonOptions!: ExcelCopyBufferOption;
  protected _bodyElement = document.body;
  protected _clearCopyTI?: NodeJS.Timeout;
  protected _clipCommand!: ExternalCopyClipCommand;
  protected _copiedCellStyle = 'copied';
  protected _copiedCellStyleLayerKey = 'copy-manager';
  protected _copiedRanges: CellRange[] | null = null;
  protected _eventHandler: SlickEventHandler;
  protected _grid!: SlickGrid;
  protected _onCopyInit?: () => void;
  protected _onCopySuccess?: (rowCount: number) => void;
  pluginName: 'CellExternalCopyManager' = 'CellExternalCopyManager' as const;
  onCopyCells = new Slick.Event();
  onCopyCancelled = new Slick.Event();
  onPasteCells = new Slick.Event();

  constructor() {
    this._eventHandler = new Slick.EventHandler() as SlickEventHandler;
  }

  get addonOptions() {
    return this._addonOptions;
  }

  get clipCommand(): ExternalCopyClipCommand {
    return this._clipCommand;
  }

  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  init(grid: SlickGrid, options?: ExcelCopyBufferOption) {
    this._grid = grid;
    this._addonOptions = { ...this._addonOptions, ...options };
    this._copiedCellStyleLayerKey = this._addonOptions.copiedCellStyleLayerKey || 'copy-manager';
    this._copiedCellStyle = this._addonOptions.copiedCellStyle || 'copied';
    this._bodyElement = this._addonOptions.bodyElement || document.body;
    this._onCopyInit = this._addonOptions.onCopyInit || undefined;
    this._onCopySuccess = this._addonOptions.onCopySuccess || undefined;

    this._eventHandler.subscribe(this._grid.onKeyDown, this.handleKeyDown.bind(this));

    // we need a cell selection model
    const cellSelectionModel = grid.getSelectionModel();
    if (!cellSelectionModel) {
      throw new Error(`Selection model is mandatory for this plugin. Please set a selection model on the grid before adding this plugin: grid.setSelectionModel(new Slick.CellSelectionModel())`);
    }

    // we give focus on the grid when a selection is done on it.
    // without this, if the user selects a range of cell without giving focus on a particular cell, the grid doesn't get the focus and key stroke handles (ctrl+c) don't work
    this._eventHandler.subscribe(cellSelectionModel.onSelectedRangesChanged, () => this._grid.focus());
  }

  dispose() {
    this._eventHandler.unsubscribeAll();
  }

  clearCopySelection() {
    this._grid.removeCellCssStyles(this._copiedCellStyleLayerKey);
  }

  getHeaderValueForColumn(columnDef: Column) {
    if (typeof this._addonOptions.headerColumnValueExtractor === 'function') {
      const val = this._addonOptions.headerColumnValueExtractor(columnDef);
      if (val) {
        return val;
      }
    }
    return columnDef.name;
  }

  getDataItemValueForColumn(item: any, columnDef: Column, event: Event) {
    if (typeof this._addonOptions.dataItemColumnValueExtractor === 'function') {
      const val = this._addonOptions.dataItemColumnValueExtractor(item, columnDef);
      if (val) {
        return val;
      }
    }

    let retVal = '';

    // if a custom getter is not defined, we call serializeValue of the editor to serialize
    if (columnDef) {
      if (columnDef.editor) {
        const tmpP = document.createElement('p');
        const editor = new (columnDef as any).editor({
          container: tmpP,  // a dummy container
          column: columnDef,
          event,
          position: { top: 0, left: 0 },  // a dummy position required by some editors
          grid: this._grid,
        });
        editor.loadValue(item);
        retVal = editor.serializeValue();
        editor.destroy();
        tmpP.remove();
      } else {
        retVal = item[columnDef.field || ''];
      }
    }

    return retVal;
  }

  setDataItemValueForColumn(item: any, columnDef: Column, value: any): any | void {
    if (!columnDef?.denyPaste) {
      if (this._addonOptions.dataItemColumnValueSetter) {
        return this._addonOptions.dataItemColumnValueSetter(item, columnDef, value);
      }

      // if a custom setter is not defined, we call applyValue of the editor to unserialize
      if (columnDef.editor) {
        const tmpDiv = document.createElement('div');
        const editor = new (columnDef as any).editor({
          container: tmpDiv, // a dummy container
          column: columnDef,
          position: { top: 0, left: 0 },  // a dummy position required by some editors
          grid: this._grid
        });
        editor.loadValue(item);
        editor.applyValue(item, value);
        editor.destroy();
        tmpDiv.remove();
      } else {
        item[columnDef.field] = value;
      }
    }
  }

  setIncludeHeaderWhenCopying(includeHeaderWhenCopying: boolean) {
    this._addonOptions.includeHeaderWhenCopying = includeHeaderWhenCopying;
  }

  //
  // protected functions
  // ---------------------

  protected createTextBox(innerText: string) {
    const textAreaElm = createDomElement('textarea', {
      value: innerText,
      style: {
        position: 'absolute',
        left: '-1000px',
        top: `${document.body.scrollTop}px`,
      }
    });
    this._bodyElement.appendChild(textAreaElm);
    textAreaElm.select();

    return textAreaElm;
  }

  protected decodeTabularData(grid: SlickGrid, textAreaElement: HTMLTextAreaElement) {
    const columns = grid.getColumns();
    const clipText = textAreaElement.value;
    const clipRows = clipText.split(/[\n\f\r]/);
    // trim trailing CR if present
    if (clipRows[clipRows.length - 1] === '') {
      clipRows.pop();
    }

    let j = 0;
    const clippedRange: any[] = [];
    this._bodyElement.removeChild(textAreaElement);

    for (const clipRow of clipRows) {
      clippedRange[j++] = clipRow !== '' ? clipRow.split('\t') : [''];
    }
    const selectedCell = this._grid.getActiveCell();
    const ranges = this._grid.getSelectionModel()?.getSelectedRanges();
    const selectedRange = ranges?.length ? ranges[0] : null;   // pick only one selection
    let activeRow: number;
    let activeCell: number;

    if (selectedRange) {
      activeRow = selectedRange.fromRow;
      activeCell = selectedRange.fromCell;
    } else if (selectedCell) {
      activeRow = selectedCell.row;
      activeCell = selectedCell.cell;
    } else {
      return; // we don't know where to paste
    }

    let oneCellToMultiple = false;
    let destH = clippedRange.length;
    let destW = clippedRange.length ? clippedRange[0].length : 0;
    if (clippedRange.length === 1 && clippedRange[0].length === 1 && selectedRange) {
      oneCellToMultiple = true;
      destH = selectedRange.toRow - selectedRange.fromRow + 1;
      destW = selectedRange.toCell - selectedRange.fromCell + 1;
    }
    const availableRows = (this._grid.getData() as any[]).length - activeRow;
    let addRows = 0;

    // ignore new rows if we don't have a "newRowCreator"
    if ((availableRows < destH) && typeof this._addonOptions.newRowCreator === 'function') {
      const d: any[] = this._grid.getData();
      for (addRows = 1; addRows <= (destH - availableRows); addRows++) {
        d.push({});
      }
      this._grid.setData(d);
      this._grid.render();
    }

    const overflowsBottomOfGrid = (activeRow + destH) > this._grid.getDataLength();
    if (overflowsBottomOfGrid && typeof this._addonOptions.newRowCreator === 'function') {
      const newRowsNeeded = activeRow + destH - this._grid.getDataLength();
      this._addonOptions.newRowCreator(newRowsNeeded);
    }

    this._clipCommand = {
      isClipboardCommand: true,
      clippedRange,
      oldValues: [],
      cellExternalCopyManager: this,
      _options: this._addonOptions,
      setDataItemValueForColumn: this.setDataItemValueForColumn,
      markCopySelection: this.markCopySelection,
      oneCellToMultiple,
      activeRow,
      activeCell,
      destH,
      destW,
      maxDestY: this._grid.getDataLength(),
      maxDestX: this._grid.getColumns().length,
      h: 0,
      w: 0,

      execute: () => {
        this._clipCommand.h = 0;
        for (let y = 0; y < this._clipCommand.destH; y++) {
          this._clipCommand.oldValues[y] = [];
          this._clipCommand.w = 0;
          this._clipCommand.h++;
          for (let x = 0; x < this._clipCommand.destW; x++) {
            this._clipCommand.w++;
            const desty = activeRow + y;
            const destx = activeCell + x;

            if (desty < this._clipCommand.maxDestY && destx < this._clipCommand.maxDestX) {
              // const nd = this._grid.getCellNode(desty, destx);
              const dt = this._grid.getDataItem(desty);
              this._clipCommand.oldValues[y][x] = dt[columns[destx]['field']];
              if (oneCellToMultiple) {
                this.setDataItemValueForColumn(dt, columns[destx], clippedRange[0][0]);
              } else {
                this.setDataItemValueForColumn(dt, columns[destx], clippedRange[y] ? clippedRange[y][x] : '');
              }
              this._grid.updateCell(desty, destx);
              this._grid.onCellChange.notify({
                row: desty,
                cell: destx,
                item: dt,
                grid: this._grid,
                column: {} as unknown as Column,
              });
            }
          }
        }

        const bRange = {
          fromCell: activeCell,
          fromRow: activeRow,
          toCell: activeCell + this._clipCommand.w - 1,
          toRow: activeRow + this._clipCommand.h - 1
        };
        this.markCopySelection([bRange]);
        this._grid.getSelectionModel()?.setSelectedRanges([bRange]);
        this.onPasteCells.notify({ ranges: [bRange] });
      },

      undo: () => {
        for (let y = 0; y < this._clipCommand.destH; y++) {
          for (let x = 0; x < this._clipCommand.destW; x++) {
            const desty = activeRow + y;
            const destx = activeCell + x;

            if (desty < this._clipCommand.maxDestY && destx < this._clipCommand.maxDestX) {
              // const nd = this._grid.getCellNode(desty, destx);
              const dt = this._grid.getDataItem(desty);
              if (oneCellToMultiple) {
                this.setDataItemValueForColumn(dt, columns[destx], this._clipCommand.oldValues[0][0]);
              } else {
                this.setDataItemValueForColumn(dt, columns[destx], this._clipCommand.oldValues[y][x]);
              }
              this._grid.updateCell(desty, destx);
              this._grid.onCellChange.notify({
                row: desty,
                cell: destx,
                item: dt,
                grid: this._grid,
                column: {} as unknown as Column,
              });
            }
          }
        }

        const bRange = {
          fromCell: activeCell,
          fromRow: activeRow,
          toCell: activeCell + this._clipCommand.w - 1,
          toRow: activeRow + this._clipCommand.h - 1
        };

        this.markCopySelection([bRange]);
        this._grid.getSelectionModel()?.setSelectedRanges([bRange]);
        this.onPasteCells.notify({ ranges: [bRange] });
        if (typeof this._addonOptions.onPasteCells === 'function') {
          this._addonOptions.onPasteCells(new Slick.EventData(), { ranges: [bRange] });
        }

        if (addRows > 1) {
          const data = this._grid.getData() as any[];
          for (; addRows > 1; addRows--) {
            data.splice(data.length - 1, 1);
          }
          this._grid.setData(data);
          this._grid.render();
        }
      }
    };

    if (this._addonOptions.clipboardCommandHandler) {
      this._addonOptions.clipboardCommandHandler(this._clipCommand);
    } else {
      this._clipCommand.execute();
    }
  }


  protected handleKeyDown(e: any): boolean | void {
    let ranges: CellRange[];
    if (!this._grid.getEditorLock().isActive() || this._grid.getOptions().autoEdit) {
      if (e.which === KeyCode.ESCAPE || e.key === 'Escape') {
        if (this._copiedRanges) {
          e.preventDefault();
          this.clearCopySelection();
          this.onCopyCancelled.notify({ ranges: this._copiedRanges });
          if (typeof this._addonOptions.onCopyCancelled === 'function') {
            this._addonOptions.onCopyCancelled(e, { ranges: this._copiedRanges });
          }
          this._copiedRanges = null;
        }
      }

      if ((e.which === KeyCode.C || e.key === 'c' || e.which === KeyCode.INSERT || e.key === 'Insert') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {    // CTRL+C or CTRL+INS
        if (typeof this._onCopyInit === 'function') {
          this._onCopyInit.call(this);
        }
        ranges = this._grid.getSelectionModel()?.getSelectedRanges() ?? [];
        if (ranges.length !== 0) {
          this._copiedRanges = ranges;
          this.markCopySelection(ranges);
          this.onCopyCells.notify({ ranges });
          if (typeof this._addonOptions.onCopyCells === 'function') {
            this._addonOptions.onCopyCells(e, { ranges });
          }

          const columns = this._grid.getColumns();
          let clipText = '';

          for (let rg = 0; rg < ranges.length; rg++) {
            const range = ranges[rg];
            const clipTextRows = [];
            for (let i = range.fromRow; i < range.toRow + 1; i++) {
              const clipTextCells = [];
              const dt = this._grid.getDataItem(i);

              if (clipTextRows.length === 0 && this._addonOptions.includeHeaderWhenCopying) {
                const clipTextHeaders = [];
                for (let j = range.fromCell; j < range.toCell + 1; j++) {
                  if (columns[j].name!.length > 0) {
                    clipTextHeaders.push(this.getHeaderValueForColumn(columns[j]));
                  }
                }
                clipTextRows.push(clipTextHeaders.join('\t'));
              }

              for (let j = range.fromCell; j < range.toCell + 1; j++) {
                clipTextCells.push(this.getDataItemValueForColumn(dt, columns[j], e));
              }
              clipTextRows.push(clipTextCells.join('\t'));
            }
            clipText += clipTextRows.join('\r\n') + '\r\n';
          }

          if ((window as any).clipboardData) {
            (window as any).clipboardData.setData('Text', clipText);
            return true;
          } else {
            const focusElm = document.activeElement as HTMLElement;
            const textAreaElm = this.createTextBox(clipText);
            textAreaElm.focus();

            setTimeout(() => {
              this._bodyElement.removeChild(textAreaElm);
              // restore focus when possible
              focusElm ? focusElm.focus() : console.log('No element to restore focus to after copy?');
            }, this.addonOptions?.clipboardPasteDelay ?? CLIPBOARD_PASTE_DELAY);

            if (typeof this._onCopySuccess === 'function') {
              // If it's cell selection, use the toRow/fromRow fields
              const rowCount = (ranges.length === 1) ? ((ranges[0].toRow + 1) - ranges[0].fromRow) : ranges.length;
              this._onCopySuccess(rowCount);
            }

            return false;
          }
        }
      }

      if (!this._addonOptions.readOnlyMode && (
        ((e.which === KeyCode.V || e.key === 'v') && (e.ctrlKey || e.metaKey) && !e.shiftKey)
        || ((e.which === KeyCode.INSERT || e.key === 'Insert') && e.shiftKey && !e.ctrlKey)
      )) {    // CTRL+V or Shift+INS
        const textBoxElm = this.createTextBox('');
        setTimeout(() => this.decodeTabularData(this._grid, textBoxElm), this.addonOptions?.clipboardPasteDelay ?? CLIPBOARD_PASTE_DELAY);
        return false;
      }
    }
  }

  protected markCopySelection(ranges: CellRange[]) {
    this.clearCopySelection();

    const columns = this._grid.getColumns();
    const hash: any = {};
    for (const range of ranges) {
      for (let j = range.fromRow; j <= range.toRow; j++) {
        hash[j] = {};
        for (let k = range.fromCell; k <= range.toCell && k < columns.length; k++) {
          hash[j][columns[k].id] = this._copiedCellStyle;
        }
      }
    }
    this._grid.setCellCssStyles(this._copiedCellStyleLayerKey, hash);
    clearTimeout(this._clearCopyTI as NodeJS.Timeout);
    this._clearCopyTI = setTimeout(() => this.clearCopySelection(), this.addonOptions?.clearCopySelectionDelay || CLEAR_COPY_SELECTION_DELAY);
  }
}