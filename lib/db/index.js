/**
 * lib/db/index.js — DB 모듈 public API
 *
 * 외부에서는 항상 이 파일을 통해 import:
 *   import { initDB, getAll, put } from '@/lib/db';
 *
 * 내부 분할 (feedback_v3_proactive_maintenance 원칙):
 *   - constants.js: DB 식별자, store 목록
 *   - init.js:      initDB, _getDB
 *   - schema.js:    store 정의 (onupgradeneeded)
 *   - operations.js: CRUD 공통 함수
 */

export { DB_NAME, DB_VERSION, ALL_STORES } from './constants';
export { initDB } from './init';
export {
  getAll,
  getById,
  getByIndex,
  put,
  bulkPut,
  deleteById,
  runTransaction,
  clearStore,
  deleteWithChildren,
  exportAll,
  exportSelected,
  importAll,
  hasStore,
} from './operations';
export {
  MODULE_GROUPS,
  COMMON_STORES,
  MODULE_KEYS,
  storesForScopes,
} from './module-stores';
