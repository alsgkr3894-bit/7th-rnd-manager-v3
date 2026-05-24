/**
 * lib/sales — 메뉴판매량 모듈 통합 진입점
 *
 * 사용:
 *   import { validateSalesFile, classifyAndPrepare,
 *            saveSalesUpload, checkMonthExists, getUploadedFiles } from '@/lib/sales';
 */

export { validateSalesFile } from './parse.js';
export { classifyAndPrepare } from './classify.js';
export {
  saveSalesUpload,
  checkMonthExists,
  getSalesFilesByMonth,
  getUploadedFiles,
} from './store.js';

// 정적 규칙/별칭 (설정 페이지에서 참조 가능)
export { SALES_ALIASES, mapAlias } from './alias.js';
export { SALES_RULES } from './classify-rules.js';
export { normalizeMenuName } from './normalize.js';
