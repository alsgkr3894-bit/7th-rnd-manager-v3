export function createAccountStores(idb) {
  if (!idb.objectStoreNames.contains('ref_accounts')) {
    const s = idb.createObjectStore('ref_accounts', { keyPath: 'id', autoIncrement: true });
    s.createIndex('role', 'role');
  }
}
