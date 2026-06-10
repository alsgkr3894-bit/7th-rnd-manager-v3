function storeEntriesOf(stores) {
  return Object.entries(stores || {});
}

function rowCountOf(value) {
  return Number.isFinite(value) ? value : 0;
}

export function pickRestoreStores(stores, selectedStores) {
  const selectedSet = new Set(Array.isArray(selectedStores) ? selectedStores : []);
  return Object.fromEntries(storeEntriesOf(stores).filter(([name]) => selectedSet.has(name)));
}

export function selectedStoresMissingFromBackup(stores, currentStats, selectedStores) {
  const backupStoreSet = new Set(storeEntriesOf(stores).map(([name]) => name));
  return (Array.isArray(selectedStores) ? selectedStores : []).filter(
    name => !backupStoreSet.has(name) && rowCountOf(currentStats?.[name]) > 0
  );
}

export function buildRestoreImpact(stores, currentStats, selectedStores) {
  const restoreStores = pickRestoreStores(stores, selectedStores);
  const rows = [];
  let totalNow = 0;
  let totalAfter = 0;

  for (const [name, backupRows] of storeEntriesOf(restoreStores)) {
    const now = rowCountOf(currentStats?.[name]);
    const after = Array.isArray(backupRows) ? backupRows.length : 0;
    if (now === 0 && after === 0) continue;
    rows.push({ name, now, after, diff: after - now });
    totalNow += now;
    totalAfter += after;
  }

  return {
    rows,
    totalNow,
    totalAfter,
    storeCount: storeEntriesOf(restoreStores).length,
  };
}
