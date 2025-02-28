import { EventNamingStyle } from '@slickgrid-universal/event-pub-sub';

import {
  AutoResizeOption,
  AutoTooltipOption,
  BackendServiceApi,
  CellMenu,
  CheckboxSelectorOption,
  Column,
  ColumnPicker,
  CompositeEditorOpenDetailOption,
  ContextMenu,
  CustomFooterOption,
  CustomTooltipOption,
  DataViewOption,
  DraggableGrouping,
  EditCommand,
  EmptyWarning,
  ExcelCopyBufferOption,
  ExcelExportOption,
  ExternalResource,
  Formatter,
  FormatterOption,
  GridMenu,
  GridState,
  GroupItemMetadataProviderOption,
  HeaderButton,
  HeaderMenu,
  ItemMetadata,
  Locale,
  Pagination,
  ResizeByContentOption,
  RowDetailView,
  RowMoveManager,
  RowSelectionModelOption,
  TextExportOption,
  TreeDataOption,
} from './index';
import { ColumnReorderFunction, GridAutosizeColsMode, OperatorType, OperatorString, } from '../enums/index';
import { TranslaterService } from '../services/translater.service';

export interface GridOption {
  /** CSS class name used on newly added row */
  addNewRowCssClass?: string;

  /** Defaults to true, which leads to always show a vertical scrolling. This is rather important to use when using the Grid Menu (hamburger) */
  alwaysShowVerticalScroll?: boolean;

  /** Defaults to 100, which is the asynchronous editor loading delay */
  asyncEditorLoadDelay?: number;

  /** Defaults to false, which leads to load editor asynchronously (delayed) */
  asyncEditorLoading?: boolean;

  /** Defaults to 50, which is the delay before the asynchronous post renderer start execution */
  asyncPostRenderDelay?: number;

  /** Defaults to 40, which is the delay before the asynchronous post renderer start cleanup execution */
  asyncPostRenderCleanupDelay?: number;

  /**
   * Automatically add a Custom Formatter on all column definitions that have an Editor.
   * Instead of manually adding a Custom Formatter on every column definitions that are editables, let's ask the system to do it in an easier automated way.
   * It will loop through all column definitions and add an Custom Editor Formatter when necessary,
   * also note that if there's already a Formatter on the column definition it will automatically use the Formatters.multiple and add the custom formatter into the `params: formatters: {}}`
   */
  autoAddCustomEditorFormatter?: Formatter;

  /** Defaults to false, when enabled will try to commit the current edit without focusing on the next row. If a custom editor is implemented and the grid cannot auto commit, you must use this option to implement it yourself */
  autoCommitEdit?: boolean;

  /** Defaults to false, when enabled will automatically open the inlined editor as soon as there is a focus on the cell (can be combined with "enableCellNavigation: true"). */
  autoEdit?: boolean;

  /**
   * Defaults to true, which leads to automatically adjust the width of each column with the available space. Similar to "Force Fit Column" but only happens on first page/component load.
   * If you wish this resize to also re-evaluate when resizing the browser, then you should also use `enableAutoSizeColumns` (it is also enabled by default)
   */
  autoFitColumnsOnFirstLoad?: boolean;

  /**
   * Defaults to false, which leads to automatically adjust the width of each column by their cell value content and only on first page/component load.
   * If you wish this resize to also re-evaluate when resizing the browser, then you should also use `enableAutoResizeColumnsByCellContent`
   */
  autosizeColumnsByCellContentOnFirstLoad?: boolean;

  /** Defaults to false, which leads to automatically adjust the size (height) of the grid to display the entire content without any scrolling in the grid. */
  autoHeight?: boolean;

  /**
   * Defaults to 60, when "autoFixResizeWhenBrokenStyleDetected" is enabled then what will be the delay timeout before quitting?
   * Note that that the resize gets called every 200ms
   */
  autoFixResizeTimeout?: number;

  /** Defaults to 2 (or 5x in Salesforce), how many good resize count do we require before we assume that it's all good and we can stop calling a resize of the grid? (only works when `autoFixResizeWhenBrokenStyleDetected` is enabled) */
  autoFixResizeRequiredGoodCount?: number;

  /** Defaults to false, this is a patch for Salesforce since we don't always have access to tab change events. */
  autoFixResizeWhenBrokenStyleDetected?: boolean;

  /** Auto-resize options (bottom padding, minHeight, ...)  */
  autoResize?: AutoResizeOption;

  /** Auto-tooltip options (enableForCells, enableForHeaderCells, maxToolTipLength) */
  autoTooltipOptions?: AutoTooltipOption;

  /** Backend Service API definition (GraphQL/OData Services) */
  backendServiceApi?: BackendServiceApi;

  /** CSS class name used to simulate cell flashing */
  cellFlashingCssClass?: string;

  /** CSS class name used when highlighting a cell value. Useful to change background color of the activated cell */
  cellHighlightCssClass?: string | null;

  /** Cell menu options (Action menu) */
  cellMenu?: CellMenu;

  /**
   * Defaults to false, can the cell value (dataContext) be undefined?
   * Typically undefined values are disregarded when sorting, when setting this flag it will adds extra logic to Sorting and also sort undefined value.
   * This is an extra flag that user has to enable by themselve because Sorting undefined values has unintended behavior in some use case
   * (for example Row Detail has UI inconsistencies since undefined is used in the plugin's logic)
   */
  cellValueCouldBeUndefined?: boolean;

  /** Checkbox Select Plugin options (columnId, cssClass, toolTip, width) */
  checkboxSelector?: CheckboxSelectorOption;

  /** A callback function that will be used to define row spanning accross multiple columns */
  colspanCallback?: (item: any) => ItemMetadata;

  /** Defaults to " - ", separator between the column group label and the column label. */
  columnGroupSeparator?: string;

  /** Column Picker Plugin options (columnTitle, forceFitTitle, syncResizeTitle) */
  columnPicker?: ColumnPicker;

  /** Optionally provide global options to the Composite Editor instead of having to redeclare them every time you want to use it */
  compositeEditorOptions?: Partial<CompositeEditorOpenDetailOption>;

  /** Context menu options (mouse right+click) */
  contextMenu?: ContextMenu;

  /** Defaults to false, which leads to create the footer row of the grid */
  createFooterRow?: boolean;

  /** Default to false, which leads to create an extra pre-header panel (on top of column header) for column grouping purposes */
  createPreHeaderPanel?: boolean;

  /** Custom Footer Options */
  customFooterOptions?: CustomFooterOption;

  /**
   * Custom Tooltip Options, the tooltip could be defined in any of the Column Definition or in the Grid Options,
   * it will first try to find it in the Column that the user is hovering over or else (when not found) go and try to find it in the Grid Options
   */
  customTooltip?: CustomTooltipOption;

  /** Data item column value extractor (getter) that can be used by the Excel like copy buffer plugin */
  dataItemColumnValueExtractor?: (item: any, columnDef: Column) => any;

  /** Data item column value setter that can be used by the Excel like copy buffer plugin */
  dataItemColumnValueSetter?: (item: any, columnDef: Column, value: any) => void;

  /** Unique property name on the dataset used by Slick.Data.DataView */
  datasetIdPropertyName?: string;

  /** Some of the SlickGrid DataView options */
  dataView?: DataViewOption & {
    /**
     * Defaults to true, when using row selection,
     * if you don't want the items that are not visible (due to being filtered out or being on a different page) to stay selected,
     * then set this property as 'false'. You can also set any of the preserve options instead of a boolean value.
     */
    syncGridSelection?: boolean | { preserveHidden: boolean; preserveHiddenOnSelectionChange: boolean; };

    /**
     * Defaults to false, do we also want to keep the row selections kept between the pages when using BackendServiceApi?
     * Note that this flag will be skipped if "syncGridSelection" is already disabled, both flags are used in conjunction
     */
    syncGridSelectionWithBackendService?: boolean;
  };

  /** Defaults to 500, how long to wait between each characters that the user types before processing the filtering process when using a Backend Service? */
  defaultBackendServiceFilterTypingDebounce?: number;

  /** Defaults to 'id', what is the default column field id to sort when calling clear sorting */
  defaultColumnSortFieldId?: string;

  /** Default column width, is set to 80 when null */
  defaultColumnWidth?: number;

  /** Default prefix for Component Event names (events created in the Web Component) */
  defaultComponentEventPrefix?: string;

  /** The default filter model to use when none is specified */
  defaultFilter?: any;

  /** Default placeholder to use in Filters that support placeholder (autocomplete, input, flatpickr, select, ...) */
  defaultFilterPlaceholder?: string;

  /** Defaults to 'RangeInclusive', allows to change the default filter range operator */
  defaultFilterRangeOperator?: OperatorString | OperatorType;

  /** Default prefix for SlickGrid Event names (events created in the SlickGrid and/or DataView objects) */
  defaultSlickgridEventPrefix?: string;

  /** Draggable Grouping Plugin options & events */
  draggableGrouping?: DraggableGrouping;

  /** Defaults to false, when enabled will give the possibility to edit cell values with inline editors. */
  editable?: boolean;

  /** option to intercept edit commands and implement undo support. */
  editCommandHandler?: (item: any, column: Column, command: EditCommand) => void;

  /** Editor classes factory */
  editorFactory?: any;

  /** a global singleton editor lock. */
  editorLock?: any;

  /** Default to 450ms and only applies to Composite Editor, how long to wait until we start validating the editor changes on Editor that support it (integer, float, text, longText). */
  editorTypingDebounce?: number;

  /** Warning message options for the div showing when dataset becomes empty (enableEmptyDataWarningMessage must be enabled) */
  emptyDataWarning?: EmptyWarning;

  /** Do we want to emulate paging when we are scrolling? */
  emulatePagingWhenScrolling?: boolean;

  /** Defaults to false, which leads to give user possibility to add row to the grid */
  enableAddRow?: boolean;

  /** Do we want to enable asynchronous (delayed) post rendering */
  enableAsyncPostRender?: boolean;

  /** Defaults to false, which leads to cleanup after the post render is finished executing */
  enableAsyncPostRenderCleanup?: boolean;

  /** Defaults to true, which will automatically resize the grid whenever the browser size changes */
  enableAutoResize?: boolean;

  /** Defaults to true, which will automatically resize the column headers whenever the grid size changes */
  enableAutoSizeColumns?: boolean;

  /**
   * Defaults to false, which will automatically resize the column headers by their cell content whenever the grid size changes.
   * NOTE: this option is opt-in and if you decide to use it then you should disable the other grid option `enableAutoSizeColumns: false`
   */
  enableAutoResizeColumnsByCellContent?: boolean;

  /** Defaults to false, which leads to showing tooltip over cell & header values that are not shown completely (... ellipsis) */
  enableAutoTooltip?: boolean;

  /** Do we want to enable Cell Menu? (Action menu cell click) */
  enableCellMenu?: boolean;

  /** Defaults to false, which will let user click on cell and navigate with arrow keys. */
  enableCellNavigation?: boolean;

  /** Defaults to false, when enabled it will add a column for checkbox selection at the 1st column position. A selection will trigger the "onSelectedRowsChanged" event. */
  enableCheckboxSelector?: boolean;

  /** Defaults to true, when enabled will give the possibility to do a right+click on any header title which will open the list of column. User can show/hide a column by using the checkbox from that picker list. */
  enableColumnPicker?: boolean;

  /**
   * Defaults to true, this option can be a boolean or a Column Reorder function.
   * When provided as a boolean, it will permits the user to move an entire column from a position to another.
   * We could also provide a Column Reorder function, there's mostly only 1 use for this which is the SlickDraggableGrouping plugin.
   */
  enableColumnReorder?: boolean | ColumnReorderFunction;

  /**
   * Defaults to true, when doing a double-click in the column resize section (top right of a column when the mouse resize icon shows up),
   * do we want to automatically resize the column by its cell content?
   */
  enableColumnResizeOnDoubleClick?: boolean;

  /**
   * Defaults to false, do we want to use a Composite Editor Modal?
   * Composite Editor is providing a modal window to edit an entire row, it reuses every column definition editor/validators and displays them in a convenient single form.
   */
  enableCompositeEditor?: boolean;

  /** Do we want to enable Context Menu? (mouse right+click) */
  enableContextMenu?: boolean;

  /**
   * Defaults to false, do we want to make a deep copy of the dataset before loading it into the grid?
   * Useful with Salesforce to avoid proxy object error when trying to update a property of an item object by reference (which SlickGrid does a lot)
   */
  enableDeepCopyDatasetOnPageLoad?: boolean;

  /** Defaults to false, do we want to enable the Draggable Grouping Plugin? */
  enableDraggableGrouping?: boolean;

  /**
   * Defaults to true, which leads to use an Excel like copy buffer that gets copied in clipboard and can be pasted back in Excel or any other app.
   * NOTE: please note that this option will NOT work when "Row Selection" & "Row Move" are enabled, because features are conflicting with each other.
   */
  enableExcelCopyBuffer?: boolean;

  /**
   * Defaults to true, will display a warning message positioned inside the grid when there's no data returned.
   * When using local (in-memory) dataset, it will show the message when there's no filtered data returned.
   * When using backend Pagination it will display the message as soon as the total row count is 0.
   */
  enableEmptyDataWarningMessage?: boolean;

  /** Do we want to enable the Excel Export? (if Yes, it will show up in the Grid Menu) */
  enableExcelExport?: boolean;

  /** Do we want to enable Filters? */
  enableFiltering?: boolean;

  /**
   * Defaults to false, do we want to globally trim white spaces on all filter values typed by the user?
   * User can choose to override the default
   */
  enableFilterTrimWhiteSpace?: boolean;

  /** Do we want to enable Grid Menu (aka hamburger menu) */
  enableGridMenu?: boolean;

  /** Defaults to false, do we want to enable the Grouping & Aggregator Plugin? */
  enableGrouping?: boolean;

  /** Do we want to enable Header Buttons? (buttons with commands that can be shown beside each column)  */
  enableHeaderButton?: boolean;

  /** Do we want to enable Header Menu? (when hovering a column, a menu will appear for that column) */
  enableHeaderMenu?: boolean;

  /** Do we want to enable a styling effect when hovering any row from the grid? */
  enableMouseHoverHighlightRow?: boolean;

  /**
   * Do we want to always enable the mousewheel scroll handler?
   * In other words, do we want the mouse scrolling would work from anywhere.
   * Typically we should only enable it when using a Frozen/Pinned grid and if it does detect it to be a frozen grid,
   * then it will automatically enable the scroll handler if this flag was originally set to undefined (which it is by default unless the user specifically disabled it).
   */
  enableMouseWheelScrollHandler?: boolean;

  /** Do we want to enable pagination? Currently only works with a Backend Service API */
  enablePagination?: boolean;

  /** Defaults to false, do we want to enable the Row Detail Plugin? */
  enableRowDetailView?: boolean;

  /** Defaults to false, when enabled it will make possible to move rows in the grid. */
  enableRowMoveManager?: boolean;

  /** Do we want to enable row selection? */
  enableRowSelection?: boolean;

  /** Do we want to enable sorting? */
  enableSorting?: boolean;

  /** Do we want to enable the Export to Text File? (if Yes, it will show up in the Grid Menu) */
  enableTextExport?: boolean;

  /** Do we want to enable text selection on cells? Useful when user wants to do copy to clipboard. */
  enableTextSelectionOnCells?: boolean;

  /** Do we want to enable localization translation (i18n)? */
  enableTranslate?: boolean;

  /** Do we want to enable Tree Data grid? */
  enableTreeData?: boolean;

  /**
   * Event naming style for the exposed SlickGrid & Component Events
   * Style could be (camelCase, lowerCase, kebabCase)
   */
  eventNamingStyle?: EventNamingStyle;

  /** Options for the ExcelCopyBuffer Extension */
  excelCopyBufferOptions?: ExcelCopyBufferOption;

  /** Do we want explicit grid initialization? */
  explicitInitialization?: boolean;

  /** Some default options to set for the Excel export service */
  excelExportOptions?: ExcelExportOption;

  /**
   * Default to 0, how long to wait between each characters that the user types before processing the filtering process (only applies for local/in-memory grid).
   * Especially useful when you have a big dataset and you want to limit the amount of search called (by default every keystroke will trigger a search on the dataset and that is sometime slow).
   * This is only used by and relevant to 2 filters (InputFilter & CompoundInputFilter) which are the only ones triggering a search after each character typed.
   * NOTE: please note that the BackendServiceApi has its own `filterTypingDebounce` within the `BackendServiceApi` options which is set to 500ms.
   */
  filterTypingDebounce?: number;

  /** Defaults to 25, which is the grid footer row panel height */
  footerRowHeight?: number;

  /** Do we want to force fit columns in the grid at all time? */
  forceFitColumns?: boolean;

  /** Defaults to false, force synchronous scrolling */
  forceSyncScrolling?: boolean;

  /** Formatter classes factory */
  formatterFactory?: any;

  /** Formatter commonly used options defined for the entire grid */
  formatterOptions?: FormatterOption;

  /** Optional frozen border in pixel to remove from total header width calculation (depending on your border width, it should be 0, 1 or 2 defaults is 1) */
  frozenHeaderWidthCalcDifferential?: number;

  /** Defaults to false, do we want to freeze (pin) the bottom portion instead of the top */
  frozenBottom?: boolean;

  /** Number of column index(es) to freeze (pin) in the grid */
  frozenColumn?: number;

  /** Number of row index(es) to freeze (pin) in the grid */
  frozenRow?: number;

  /**
   * Defaults to 100, what is the minimum width to keep for the section on the right of a frozen grid?
   * This basically fixes an issue that if the user expand any column on the left of the frozen (pinning) section
   * and make it bigger than the viewport width, then the grid becomes unusable because the right section goes into a void/hidden area.
   */
  frozenRightViewportMinWidth?: number;

  /** Defaults to false, which leads to have row(s) taking full width */
  fullWidthRows?: boolean;

  /** defaults to None, Grid Autosize Columns Mode used when calling "autosizeColumns()" method */
  gridAutosizeColsMode?: GridAutosizeColsMode;

  /** Grid DOM element container ID (used Slickgrid-Universal auto-resizer) */
  gridContainerId?: string;

  /**
   * When using a fixed grid height, can be a number or a string.
   * if a number is provided it will add the `px` suffix for pixels, or if a string is passed it will use it as is.
   */
  gridHeight?: number | string;

  /** Grid DOM element ID */
  gridId?: string;

  /** Grid Menu options (aka hamburger menu) */
  gridMenu?: GridMenu;

  /**
   * When using a fixed grid width, can be a number or a string.
   * if a number is provided it will add the `px` suffix for pixels, or if a string is passed it will use it as it is.
   */
  gridWidth?: number | string;

  /** Optional option to provide to the GroupItemMetadataProvider */
  groupItemMetadataOption?: GroupItemMetadataProviderOption;

  /** Header row height in pixels (only type the number). Header row is where the filters are. */
  headerRowHeight?: number;

  /** Header button options */
  headerButton?: HeaderButton;

  /** Header menu options */
  headerMenu?: HeaderMenu;

  /**
   * Defaults to false, should we ignore any accent while filtering and sorting text?
   * For example if our text is "José" and we type "Jose" then it won't return unless we use this flag because "é" is not equal to "e"
   */
  ignoreAccentOnStringFilterAndSort?: boolean;

  /**
   * When using custom Locales (that is when user is NOT using a Translate Service, this property does nothing when used with Translate Service),
   * This is useful so that every component of the lib knows the locale.
   * For example, not providing this will make the Date Filter/Editor use English by default even if we use different "locales",
   * so this basically helps certain elements know which locale is currently used.
   */
  locale?: string;

  /** Set of Locale translations used by the library */
  locales?: Locale;

  /** Do we leave space for new rows in the DOM visible buffer */
  leaveSpaceForNewRows?: boolean;

  /** What is the minimum row buffer to use? */
  minRowBuffer?: number;

  /** Defaults to false, which leads to be able to do multiple columns sorting (or single sort when false) */
  multiColumnSort?: boolean;

  /** Defaults to true, which leads to be able to do multiple selection */
  multiSelect?: boolean;

  /** Defaults to true, which will display numbers indicating column sort precedence are displayed in the columns when multiple columns selected */
  numberedMultiColumnSort?: boolean;

  /** Pagination options (pageSize, pageSizes, pageNumber, totalItems) */
  pagination?: Pagination;

  /** if you want to pass custom paramaters to your Formatter/Editor or anything else */
  params?: any | any[];

  /** Extra pre-header panel height (on top of column header) */
  preHeaderPanelHeight?: number;

  /** Do we want to preserve copied selection on paste? */
  preserveCopiedSelectionOnPaste?: boolean;

  /** Query presets before grid load (filters, sorters, pagination) */
  presets?: GridState;

  /** Preselect certain rows by their row index ("enableCheckboxSelector" must be enabled) */
  preselectedRows?: number[];

  /** Register any external Resources (Components, Services) like the ExcelExportService, TextExportService, SlickCompositeEditorComponent, ... */
  registerExternalResources?: ExternalResource[];

  /** Defaults to true, should we reset (rollback) the search filter input value to its previous value when the `onBeforeSearchChange` event bubbling is prevented? */
  resetFilterSearchValueAfterOnBeforeCancellation?: boolean;

  /**
   * defaults to true, do we want to resize the grid by content only on the first page or anytime the data changes?
   * Requires `enableAutoResizeColumnsByCellContent` to be set.
   * Also don't get confused with `autosizeColumnsByCellContentOnFirstLoad` that flag won't block resize by content after the first load while `resizeByContentOnlyOnFirstLoad`
   */
  resizeByContentOnlyOnFirstLoad?: boolean;

  /** Resize by Content multiple options */
  resizeByContentOptions?: ResizeByContentOption;

  /**
   * Should we skip filtering when the Operator is changed before the Compound Filter input.
   * For example, with a CompoundDate Filter it's probably better to wait until we have a date filled before filtering even if we start with the operator.
   * Defaults to True only for the Compound Date Filter (all other compound filters will still filter even when operator is first changed).
   */
  skipCompoundOperatorFilterWithNullInput?: boolean;

  /** Row Detail View Plugin options & events (columnId, cssClass, toolTip, width) */
  rowDetailView?: RowDetailView;

  /** Grid row height in pixels (only type the number). Row of cell values. */
  rowHeight?: number;

  /** Row Move Manager Plugin options & events */
  rowMoveManager?: RowMoveManager;

  /** Row selection options */
  rowSelectionOptions?: RowSelectionModelOption;

  /**
   * Optionally pass some options to the 3rd party lib "cure53/DOMPurify" used in some Filters.
   * For this to work, "enableRenderHtml" as to be enabled.
   */
  sanitizeHtmlOptions?: any;

  /**
   * By default the lib will use DOMPurify to sanitize any Html,
   * but you could optionally pass your own sanitizer function which will run instead of DOM Purify
   */
  sanitizer?: (dirtyHtml: string) => string;

  /** CSS class name used when cell is selected */
  selectedCellCssClass?: string;

  /** Do we want to show cell selection? */
  showCellSelection?: boolean;

  /**
   * Do we want to show a custom footer with some metrics?
   * By default it will show how many items are in the dataset and when was last update done (timestamp)
   * */
  showCustomFooter?: boolean;

  /** Do we want to show the footer row? */
  showFooterRow?: boolean;

  /** Do we want to show header row? */
  showHeaderRow?: boolean;

  /** Do we want to show metrics in custom footer? (dataset length, data filtered, last update timestamp) */
  showFooterMetrics?: boolean;

  /** Do we want to show the extra pre-header panel (on top of column header) for column grouping purposes */
  showPreHeaderPanel?: boolean;

  /** Do we want to show top panel row? */
  showTopPanel?: boolean;

  /** Defaults to true, which leads to render a separate span for the number and styles it with css class <i>slick-sort-indicator-numbered</i> */
  sortColNumberInSeparateSpan?: boolean;

  /**
   * Defaults to true, which leads to suppress the cell from becoming active when cell as an editor and is clicked.
   * This flag should be enabled especially when mixing these 2 features (Row Selections & Inline Editors)
   */
  suppressActiveCellChangeOnEdit?: boolean;

  /** Defaults to false, when set to True will sync the column cell resize & apply the column width */
  syncColumnCellResize?: boolean;

  /** Some default options to set for the text file export service */
  textExportOptions?: TextExportOption;

  /** What is the top panel height in pixels (only type the number) */
  topPanelHeight?: number;

  /** Translater Service used by Slickgrid-Universal for translating locale. */
  translater?: TranslaterService;

  /** I18N Namespace Translation Prefix, you can also optionally change the separator by setting "translationNamespaceSeparator" (defaults to ":") */
  translationNamespace?: string;

  /** Defaults to ":", Separator to use between the I18N Namespace Prefix */
  translationNamespaceSeparator?: string;

  /** Tree Data options to define how the tree data is structure */
  treeDataOptions?: TreeDataOption;

  /** Defaults to false, when set to True will lead to multiple columns sorting without the need to hold or do shift-click to execute a multiple sort. */
  tristateMultiColumnSort?: boolean;

  /** Defaults to false, do we want to use default Salesforce grid  */
  useSalesforceDefaultGridOptions?: boolean;

  /** Defaults to null, which is the default Viewport CSS class name */
  viewportClass?: string;
}
