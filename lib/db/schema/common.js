/**
 * lib/db/schema/common.js — 공통 store (settings, upload_log, migration_flags)
 *
 * settings store는 구버전/전체 백업 복원 호환용 예약 store다.
 * 실제 시스템 설정은 lib/settings.js의 SETTING_LS_KEYS(localStorage)를 기준으로 한다.
 */

export function createCommonStores(idb) {
  if (!idb.objectStoreNames.contains('settings')) {
    idb.createObjectStore('settings', { keyPath: 'key' });
  }

  if (!idb.objectStoreNames.contains('upload_log')) {
    const s = idb.createObjectStore('upload_log', { keyPath: 'id', autoIncrement: true });
    s.createIndex('fileHash', 'fileHash');
    s.createIndex('module', 'module');
    s.createIndex('module_fileHash', ['module', 'fileHash']);
    s.createIndex('linkedFileId', 'linkedFileId');
  }

  if (!idb.objectStoreNames.contains('migration_flags')) {
    idb.createObjectStore('migration_flags', { keyPath: 'flag' });
  }
}
