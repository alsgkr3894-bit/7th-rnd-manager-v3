/**
 * lib/db/schema/note.js — 메뉴개발노트 관련 store
 */

export function createNoteStores(idb) {
  if (!idb.objectStoreNames.contains('menu_dev_notes')) {
    const s = idb.createObjectStore('menu_dev_notes', { keyPath: 'id', autoIncrement: true });
    s.createIndex('status', 'status');
    s.createIndex('category', 'category');
    s.createIndex('createdAt', 'createdAt');
    s.createIndex('parentId', 'parentId');
    s.createIndex('brand', 'brand');
  }
  if (!idb.objectStoreNames.contains('sample_records')) {
    const s = idb.createObjectStore('sample_records', { keyPath: 'id', autoIncrement: true });
    s.createIndex('category', 'category');
    s.createIndex('menuName', 'menuName');
    s.createIndex('testDate', 'testDate');
    s.createIndex('createdAt', 'createdAt');
  }
  if (!idb.objectStoreNames.contains('work_log')) {
    const s = idb.createObjectStore('work_log', { keyPath: 'id', autoIncrement: true });
    s.createIndex('date', 'date');
    s.createIndex('type', 'type');
    s.createIndex('at', 'at');
  }
  if (!idb.objectStoreNames.contains('note_schedules')) {
    const s = idb.createObjectStore('note_schedules', { keyPath: 'id', autoIncrement: true });
    s.createIndex('date', 'date');
    s.createIndex('type', 'type');
    s.createIndex('createdAt', 'createdAt');
  }
}
