/**
 * lib/db/operations.js — IndexedDB 공통 함수 (re-export)
 *
 * 내부 분할:
 *   crud.js       — CRUD 프리미티브 (getAll/put/delete/transaction 등)
 *   upload-log.js — 업로드 로그 연동 (checkUploadHash/deleteFileWithLog)
 *   backup.js     — 백업/복원 (exportAll/exportSelected/importAll/replaceStore)
 *
 * 외부에서는 '@/lib/db' (index.js) 또는 이 파일로 동일하게 import 가능.
 */

export {
  hasStore,
  deleteDatabase,
  getAll,
  getById,
  getByIndex,
  put,
  bulkPut,
  restoreRecord,
  deleteById,
  runTransaction,
  clearStore,
  deleteWithChildren,
} from './crud';

export { checkUploadHash, deleteFileWithLog } from './upload-log';

export {
  replaceStore,
  replaceStoreForBrand,
  exportAll,
  exportAllForBrand,
  exportSelected,
  exportSelectedForBrand,
  importAll,
  importAllToBrand,
} from './backup';
