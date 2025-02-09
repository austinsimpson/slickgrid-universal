import { ExtensionName } from '../enums/index';
import { SlickEditorLock, SlickRowDetailView } from '../interfaces/index';
import {
  SlickAutoTooltip,
  SlickCellExcelCopyManager,
  SlickCellExternalCopyManager,
  SlickCellMenu,
  SlickCellRangeDecorator,
  SlickCellRangeSelector,
  SlickCellSelectionModel,
  SlickCheckboxSelectColumn,
  SlickColumnPicker,
  SlickContextMenu,
  SlickDraggableGrouping,
  SlickGridMenu,
  SlickGroupItemMetadataProvider,
  SlickHeaderButtons,
  SlickHeaderMenu,
  SlickRowMoveManager,
  SlickRowSelectionModel,
} from '../extensions/index';

export type SlickPluginList =
  SlickAutoTooltip |
  SlickCellExcelCopyManager |
  SlickCellExternalCopyManager |
  SlickCellMenu |
  SlickCellRangeDecorator |
  SlickCellRangeSelector |
  SlickCellSelectionModel |
  SlickCheckboxSelectColumn |
  SlickContextMenu |
  SlickDraggableGrouping |
  SlickEditorLock |
  SlickGroupItemMetadataProvider |
  SlickHeaderButtons |
  SlickHeaderMenu |
  SlickRowDetailView |
  SlickRowMoveManager |
  SlickRowSelectionModel;

/* eslint-disable @typescript-eslint/indent */
// disable eslint indent rule until this issue is fixed: https://github.com/typescript-eslint/typescript-eslint/issues/1824
export type InferExtensionByName<T extends ExtensionName> =
  T extends ExtensionName.autoTooltip ? SlickAutoTooltip :
  T extends ExtensionName.cellExternalCopyManager ? SlickCellExcelCopyManager :
  T extends ExtensionName.cellMenu ? SlickCellMenu :
  T extends ExtensionName.columnPicker ? SlickColumnPicker :
  T extends ExtensionName.contextMenu ? SlickContextMenu :
  T extends ExtensionName.draggableGrouping ? SlickDraggableGrouping :
  T extends ExtensionName.gridMenu ? SlickGridMenu :
  T extends ExtensionName.groupItemMetaProvider ? SlickGroupItemMetadataProvider :
  T extends ExtensionName.headerButton ? SlickHeaderButtons :
  T extends ExtensionName.headerMenu ? SlickHeaderMenu :
  T extends ExtensionName.rowDetailView ? SlickRowDetailView :
  T extends ExtensionName.rowMoveManager ? SlickRowMoveManager :
  T extends ExtensionName.rowSelection ? SlickRowSelectionModel : any;
/* eslint-enable @typescript-eslint/indent */
