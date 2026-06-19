import { scenarioBackupRestorePreview, scenarioInvalidBackup } from './backup-restore.mjs';
import { scenarioBrandIsolation } from './brand.mjs';
import { scenarioCommonCost } from './common-cost.mjs';
import { scenarioCostMargin } from './cost-margin.mjs';
import { scenarioIngredientCreate } from './ingredient.mjs';
import { scenarioIngredientPriceReport } from './ingredient-price-report.mjs';
import { scenarioMenuFormValidation, scenarioMenuMasterCreate } from './menu-master.mjs';
import { scenarioCalendarSchedule, scenarioNoteCreate } from './notes.mjs';
import { scenarioNutritionMenu } from './nutrition-menu.mjs';
import { scenarioViewerBlocking } from './permissions.mjs';
import { scenarioRecipeCostMargin } from './recipe-cost-margin.mjs';
import { scenarioSalesUpload } from './sales-upload.mjs';

export const workflowScenarios = [
  scenarioBackupRestorePreview,
  scenarioNoteCreate,
  scenarioMenuMasterCreate,
  scenarioViewerBlocking,
  scenarioInvalidBackup,
  scenarioMenuFormValidation,
  scenarioBrandIsolation,
  scenarioCalendarSchedule,
  scenarioIngredientCreate,
  scenarioCostMargin,
  scenarioSalesUpload,
  scenarioNutritionMenu,
  // P0 추가 시나리오: 레시피/단가/공통원가 흐름
  scenarioRecipeCostMargin,
  scenarioIngredientPriceReport,
  scenarioCommonCost,
];
