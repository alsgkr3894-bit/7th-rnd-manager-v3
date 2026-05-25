/**
 * lib/shipment/aggregate.js — shipment_rows 집계 (순수 함수)
 *
 * 그룹: productCode 우선, 없으면 normalizedProductName
 * 정렬: totalAmount 내림차순
 */

/**
 * @param {Array} rows — matched_basic 행만 처리
 * @param {Array} managedProducts — 관리품목 (isSevenManaged 표시용)
 * @returns {Array} aggRows
 */
export function aggregateShipmentRows(rows, managedProducts = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const byCode = new Map(managedProducts.filter(p => p.productCode).map(p => [p.productCode, p]));
  const byNorm = new Map(managedProducts.filter(p => p.normalizedProductName).map(p => [p.normalizedProductName, p]));

  const groups = new Map();
  for (const row of rows) {
    if (row.matchStatus && row.matchStatus !== 'matched_basic') continue;
    const key = row.productCode || row.normalizedProductName || row.productName || '(알수없음)';

    if (!groups.has(key)) {
      groups.set(key, {
        productCode:           row.productCode           || '',
        productName:           row.productName           || '',
        normalizedProductName: row.normalizedProductName || '',
        unit:                  row.unit                  || '',
        temperature:           row.temperature           || '',
        taxType:               row.taxType               || '',
        totalQuantity:         0,
        totalAmount:           0,
        priceMap:              new Map(),
        matchStatus:           'matched_basic',
      });
    }
    const g = groups.get(key);
    g.totalQuantity += (row.quantity || 0);
    g.totalAmount   += (row.amount   || 0);
    if (row.priceWithTax) {
      g.priceMap.set(row.priceWithTax, (g.priceMap.get(row.priceWithTax) || 0) + 1);
    }
  }

  const result = [];
  for (const [, g] of groups) {
    let priceWithTax = null;
    let priceWithTaxVariants = null;
    if (g.priceMap.size === 1) {
      priceWithTax = [...g.priceMap.keys()][0];
    } else if (g.priceMap.size > 1) {
      priceWithTax = '상이';
      priceWithTaxVariants = [...g.priceMap.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value - b.value);
    }

    const mp = g.productCode ? byCode.get(g.productCode) : byNorm.get(g.normalizedProductName);
    const isSevenManaged = mp?.isSevenManaged ?? false;

    result.push({
      productCode: g.productCode,
      productName: g.productName,
      unit:        g.unit,
      temperature: g.temperature,
      taxType:     g.taxType,
      totalQuantity: g.totalQuantity,
      priceWithTax, priceWithTaxVariants,
      totalAmount: g.totalAmount,
      matchStatus: g.matchStatus,
      isSevenManaged,
    });
  }

  result.sort((a, b) => b.totalAmount - a.totalAmount);
  return result;
}
