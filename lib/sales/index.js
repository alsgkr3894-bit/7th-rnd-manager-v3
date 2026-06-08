/**
 * lib/sales — 메뉴판매량 모듈 통합 진입점
 *
 * 사용:
 *   import { validateSalesFile, classifyAndPrepare,
 *            saveSalesUpload, checkMonthExists, getUploadedFiles } from '@/lib/sales';
 */

export { validateSalesFile } from './parse.js';
export { classifyAndPrepare } from './classify.js';
export { buildPeriodCompare, deriveCompareB } from './compare.js';
export { buildCategoryDetails } from './category.js';
export { buildGroupRanking } from './ranking.js';
export {
  SALES_UPLOAD_MODULE,
  saveSalesUpload,
  checkMonthExists,
  getSalesFilesByMonth,
  getUploadedFiles,
  deleteSalesFile,
  replaceFileClassification,
} from './store-files.js';
export { getIssues } from './store-issues.js';
export {
  getUserAliases, addUserAlias, deleteUserAlias, updateUserAlias,
  getUserRules,   addUserRule,   deleteUserRule,   updateUserRule,
  getUserExcluded, addUserExcluded, deleteUserExcluded, updateUserExcluded,
} from './store-user-rules.js';

export { resolveUnmatchedIssue, bulkExcludeIssues, bulkResolveRule } from './resolve.js';
export { buildClassifierFromDB } from './classifier-db.js';
export { exportSingleMonthXlsx, exportCompareXlsx } from './export-xlsx.js';
export { suggestRulesByMenuName, getClassificationNameOptions } from './suggest.js';
export { reclassifyAllFiles } from './reclassify.js';

// 정적 규칙/별칭 (설정 페이지에서 참조 가능)
export { SALES_ALIASES } from './alias.js';
export { SALES_RULES } from './classify-rules.js';
export { normalizeMenuName } from './normalize.js';
export { CATEGORY_ORDER, CATEGORY_INPUT_OPTIONS, MOVER_CATEGORIES, buildOrderedCategories } from './categories.js';
