/**
 * lib/db/schema/common.js — 공통 store (settings, upload_log, migration_flags)
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
