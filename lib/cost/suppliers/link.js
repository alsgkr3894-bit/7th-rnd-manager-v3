/**
 * lib/cost/suppliers/link.js — 공급업체 ↔ 식자재 제조사 자동 연결 (순수 함수)
 *
 * 공급업체 store(cost_suppliers)와 식자재의 제조사(manufacturer, 자유 입력 텍스트)는
 * FK로 연결돼 있지 않다 — 이름이 같으면(정규화 후) 같은 업체로 간주해 매칭한다.
 * lib/sales/store-user-rules.js의 normKey와 같은 규칙(trim·소문자·공백 제거).
 */

export function normalizeSupplierKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * 공급업체별로 제조사명이 일치하는 식자재 목록을 모은다.
 * @param {Array<{id:number, name:string}>} suppliers
 * @param {Array<{id?:number, productCode?:string, ingredientName?:string, displayName?:string,
 *   productName?:string, manufacturer?:string, excluded?:boolean}>} rows - 식자재관리 목록 행
 * @returns {Map<number, Array<{id, name, productCode}>>} supplierId → 연결된 식자재 배열
 */
export function buildSupplierIngredientMap(suppliers, rows) {
  const map = new Map();
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeSuppliers.length) return map;

  const supplierIdByKey = new Map();
  for (const supplier of safeSuppliers) {
    const key = normalizeSupplierKey(supplier?.name);
    if (!key) continue;
    map.set(supplier.id, []);
    supplierIdByKey.set(key, supplier.id);
  }

  for (const row of safeRows) {
    if (!row || row.excluded) continue;
    const key = normalizeSupplierKey(row.manufacturer);
    if (!key) continue;
    const supplierId = supplierIdByKey.get(key);
    if (supplierId == null) continue;
    map.get(supplierId).push({
      id: row.id,
      name: row.ingredientName || row.displayName || row.productName || '',
      productCode: row.productCode || null,
    });
  }

  return map;
}

/** 공급업체 이름 목록 — 정렬·중복 제거(제조사 입력칸 자동완성용). */
export function supplierNameOptions(suppliers) {
  const names = (Array.isArray(suppliers) ? suppliers : [])
    .map(s => (s?.name || '').trim())
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko'));
}
