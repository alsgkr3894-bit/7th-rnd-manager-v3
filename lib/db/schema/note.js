/**
 * lib/db/schema/note.js — 메뉴개발노트 관련 store
 */

export function createNoteStores(idb) {
  if (!idb.objectStoreNames.contains('menu_dev_notes')) {
    const s = idb.createObjectStore('menu_dev_notes', { keyPath: 'id', autoIncrement: true });
    s.createIndex('status', 'status');
    s.createIndex('category', 'category');
    s.createIndex('createdAt', 'createdAt');
  }
}
