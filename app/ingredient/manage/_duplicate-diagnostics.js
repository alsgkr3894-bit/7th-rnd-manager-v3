const DUPLICATE_CHECKS = [
  { key: 'productCode', label: '제품코드', get: r => r.productCode },
  { key: 'jetteCode', label: '제때코드', get: r => r.jetteCode || r.jetteProductCode },
  {
    key: 'displayName',
    label: '표시명',
    get: r => r.ingredientName || r.displayName || r.productName,
  },
];

function duplicateKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function rowLabel(row) {
  return row.ingredientName || row.displayName || row.productName || row.productCode || '이름 없음';
}

function findDuplicateGroups(rows, check) {
  const buckets = new Map();
  for (const row of rows) {
    if (row.discontinued || row.excluded) continue;
    const raw = check.get(row);
    const key = duplicateKey(raw);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { value: String(raw).trim(), rows: [] });
    buckets.get(key).rows.push(row);
  }
  return [...buckets.values()]
    .filter(group => group.rows.length > 1)
    .sort((a, b) => b.rows.length - a.rows.length || a.value.localeCompare(b.value, 'ko'));
}

export function buildDuplicateDiagnostics(rows) {
  return DUPLICATE_CHECKS.map(check => ({
    ...check,
    groups: findDuplicateGroups(rows, check),
  })).filter(check => check.groups.length > 0);
}
