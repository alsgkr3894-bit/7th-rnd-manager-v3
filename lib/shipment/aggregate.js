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
import { normalizeProductName } from '../normalize';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

/**
 * @param {Array} rows
 * @param {Array} managedProducts — 관리품목 (productType / isManaged 표시용)
 * @param {Map<string, number>} [priceLookup] — productCode → priceWithTax (제때 가격 비교 최신)
 * @returns {Array} aggRows — productType: 'exclusive' | 'generic' | 'generic-managed', isManaged: boolean
 */

export function aggregateShipmentRows(rows, managedProducts = [], priceLookup = null) {
  const safeRows = asObjectArray(rows);
  const safeManagedProducts = asObjectArray(managedProducts);
  const safePriceLookup = priceLookup instanceof Map ? priceLookup : null;
  if (safeRows.length === 0) return [];

  const byCode = new Map(
    safeManagedProducts
      .filter(p => asDisplayText(p.productCode))
      .map(p => [asDisplayText(p.productCode), p])
  );
  const byNorm = new Map(
    safeManagedProducts
      .filter(p => p.normalizedProductName || p.productName)
      .map(p => [
        asDisplayText(p.normalizedProductName) ||
          normalizeProductName(asDisplayText(p.productName)),
        p,
      ])
  );

  const groups = new Map();
  for (const row of safeRows) {
    const matchStatus = asDisplayText(row.matchStatus);
    if (matchStatus && matchStatus !== 'matched_basic') continue;

    const productCode = asDisplayText(row.productCode);
    const productName = asDisplayText(row.productName);
    const normalizedProductName = asDisplayText(row.normalizedProductName);
    const key = productCode || normalizedProductName || productName || '(알수없음)';

    if (!groups.has(key)) {
      groups.set(key, {
        productCode,
        productName,
        normalizedProductName,
        unit: asDisplayText(row.unit),
        temperature: asDisplayText(row.temperature),
        taxType: asDisplayText(row.taxType),
        totalQuantity: 0,
        totalAmount: 0,
        matchStatus: 'matched_basic',
      });
    }
    const g = groups.get(key);
    // 수량/금액은 합산 시 음수 그대로 — 반품 차감은 정상 동작
    g.totalQuantity += asFiniteNumber(row.quantity, 0) ?? 0;
    g.totalAmount += asFiniteNumber(row.amount, 0) ?? 0;
  }

  const result = [];
  for (const [, g] of groups) {
    const mp = g.productCode ? byCode.get(g.productCode) : byNorm.get(g.normalizedProductName);
    const productType =
      mp?.productType === 'exclusive'
        ? 'exclusive'
        : mp?.productType === 'generic-managed'
          ? 'generic-managed'
          : 'generic';
    // 관리품목 체크 — 신규 isManaged 우선, 구 isSevenManaged fallback
    const isManaged = mp?.isManaged ?? mp?.isSevenManaged ?? false;

    // 부가세포함가는 제때 가격 비교 최신 단가에서 productCode로 lookup
    const priceWithTax =
      safePriceLookup && g.productCode
        ? (asFiniteNumber(safePriceLookup.get(g.productCode), null) ?? null)
        : null;

    result.push({
      productCode: g.productCode,
      productName: g.productName,
      normalizedProductName: g.normalizedProductName,
      unit: g.unit,
      temperature: g.temperature,
      taxType: g.taxType,
      totalQuantity: g.totalQuantity,
      priceWithTax,
      totalAmount: g.totalAmount,
      matchStatus: g.matchStatus,
      productType,
      isManaged,
    });
  }

  result.sort(
    (a, b) => (asFiniteNumber(b.totalAmount, 0) ?? 0) - (asFiniteNumber(a.totalAmount, 0) ?? 0)
  );
  return result;
}
