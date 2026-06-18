import { scenarioBackupRestorePreview, scenarioInvalidBackup } from './backup-restore.mjs';
import { scenarioBrandIsolation } from './brand.mjs';
import { scenarioCostMargin } from './cost-margin.mjs';
import { scenarioIngredientCreate } from './ingredient.mjs';
import { scenarioMenuFormValidation, scenarioMenuMasterCreate } from './menu-master.mjs';
import { scenarioCalendarSchedule, scenarioNoteCreate } from './notes.mjs';
import { scenarioNutritionMenu } from './nutrition-menu.mjs';
import { scenarioViewerBlocking } from './permissions.mjs';
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
];
