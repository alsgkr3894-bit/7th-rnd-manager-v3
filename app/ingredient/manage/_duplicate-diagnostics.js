const DUPLICATE_CHECKS = [
  { key: 'productCode', label: '제품코드', get: r => r.productCode },
  { key: 'jetteCode', label: '제때코드', get: r => r.jetteCode || r.jetteProductCode },
  {
    key: 'displayName',
    label: '표시명',
    // displayName은 productName에서 simplifyIngredientName으로 용량 표기(2.5kg 등)를
    // 지운 값이라, 용량만 다른 서로 다른 제품(모짜렐라 치즈 2.5kg / 1kg)이 여기서 같은
    // 표시명으로 뭉쳐 오탐 중복으로 뜬다 — 원본 productName을 우선 사용해 피한다.
    get: r => r.ingredientName || r.productName || r.displayName,
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
