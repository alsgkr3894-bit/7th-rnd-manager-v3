/**
 * lib/shipment/aggregate.js — shipment_rows 집계 (순수 함수)
 *
 * 그룹: productCode 우선, 없으면 normalizedProductName
 * 정렬: totalAmount 내림차순
 *
 * 정책: 부가세포함가는 여기서 계산/표시 안 함.
 *       제때 가격 비교의 최신 단가에서 productCode로 lookup (단일 진실 소스).
 *       use-shipment의 priceLookup으로 주입.
 */

/**
 * @param {Array} rows
 * @param {Array} managedProducts — 관리품목 (productType / isManaged 표시용)
 * @param {Map<string, number>} [priceLookup] — productCode → priceWithTax (제때 가격 비교 최신)
 * @returns {Array} aggRows — productType: 'exclusive' | 'generic' | 'generic-managed', isManaged: boolean
 */
export function aggregateShipmentRows(rows, managedProducts = [], priceLookup = null) {
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
        matchStatus:           'matched_basic',
      });
    }
    const g = groups.get(key);
    // 수량/금액은 합산 시 음수 그대로 — 반품 차감은 정상 동작
    g.totalQuantity += (row.quantity || 0);
    g.totalAmount   += (row.amount   || 0);
  }

  const result = [];
  for (const [, g] of groups) {
    const mp = g.productCode ? byCode.get(g.productCode) : byNorm.get(g.normalizedProductName);
    const productType = mp?.productType === 'exclusive' ? 'exclusive'
      : mp?.productType === 'generic-managed' ? 'generic-managed'
      : 'generic';
    // 관리품목 체크 — 신규 isManaged 우선, 구 isSevenManaged fallback
    const isManaged = mp?.isManaged ?? mp?.isSevenManaged ?? false;

    // 부가세포함가는 제때 가격 비교 최신 단가에서 productCode로 lookup
    const priceWithTax = priceLookup && g.productCode
      ? (priceLookup.get(g.productCode) ?? null)
      : null;

    result.push({
      productCode: g.productCode,
      productName: g.productName,
      unit:        g.unit,
      temperature: g.temperature,
      taxType:     g.taxType,
      totalQuantity: g.totalQuantity,
      priceWithTax,
      totalAmount: g.totalAmount,
      matchStatus: g.matchStatus,
      productType,
      isManaged,
    });
  }

  result.sort((a, b) => b.totalAmount - a.totalAmount);
  return result;
}
