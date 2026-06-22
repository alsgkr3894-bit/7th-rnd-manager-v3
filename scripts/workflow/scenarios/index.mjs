import {
  scenarioBackupRestoreExecute,
  scenarioBackupRestorePreview,
  scenarioInvalidBackup,
} from './backup-restore.mjs';
import { scenarioBrandIsolation } from './brand.mjs';
import { scenarioCommonCost } from './common-cost.mjs';
import { scenarioCostMargin } from './cost-margin.mjs';
import { scenarioIngredientCreate } from './ingredient.mjs';
import { scenarioIngredientPriceReport } from './ingredient-price-report.mjs';
import {
  scenarioMenuFormValidation,
  scenarioMenuMasterCreate,
  scenarioMenuMasterCsvDownload,
} from './menu-master.mjs';
import { scenarioMenuPriceFailedRowsDownload } from './menu-price-upload.mjs';
import { scenarioCalendarSchedule, scenarioNoteCreate } from './notes.mjs';
import { scenarioNutritionMenu } from './nutrition-menu.mjs';
import { scenarioViewerBlocking } from './permissions.mjs';
import { scenarioRecipeCostMargin } from './recipe-cost-margin.mjs';
import { scenarioRecipeSaveUI } from './recipe-save-ui.mjs';
import { scenarioSalesUpload, scenarioSalesUploadInvalidExtension } from './sales-upload.mjs';
import { scenarioShipmentCsvUpload } from './shipment-upload.mjs';

export const workflowScenarios = [
  scenarioBackupRestorePreview,
  scenarioBackupRestoreExecute,
  scenarioNoteCreate,
  scenarioMenuMasterCreate,
  scenarioMenuMasterCsvDownload,
  scenarioViewerBlocking,
  scenarioInvalidBackup,
  scenarioMenuFormValidation,
  scenarioBrandIsolation,
  scenarioCalendarSchedule,
  scenarioIngredientCreate,
  scenarioCostMargin,
  scenarioSalesUpload,
  scenarioSalesUploadInvalidExtension,
  scenarioNutritionMenu,
  // P0 추가 시나리오: 레시피/단가/공통원가 흐름
  scenarioRecipeCostMargin,
  scenarioIngredientPriceReport,
  scenarioCommonCost,
  scenarioRecipeSaveUI,
  scenarioShipmentCsvUpload,
  scenarioMenuPriceFailedRowsDownload,
];
