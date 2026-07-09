/**
 * lib/db/schema/rnd.js — R&D 업무 보조 store
 */

export function createRndStores(idb) {
  if (!idb.objectStoreNames.contains('rnd_corporate_card_entries')) {
    const s = idb.createObjectStore('rnd_corporate_card_entries', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('usedAt', 'usedAt');
    s.createIndex('cardName', 'cardName');
    s.createIndex('category', 'category');
    s.createIndex('createdAt', 'createdAt');
  }
  if (!idb.objectStoreNames.contains('rnd_login_credentials')) {
    const s = idb.createObjectStore('rnd_login_credentials', {
      keyPath: 'id',
      autoIncrement: true,
    });
    s.createIndex('siteName', 'siteName');
    s.createIndex('category', 'category');
    // isIsp는 boolean이라 IndexedDB 인덱스 키로 부적합(조회 시 DataError). 인덱스를 두지 않는다.
    s.createIndex('createdAt', 'createdAt');
  }
}
