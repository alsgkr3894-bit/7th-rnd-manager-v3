/**
 * 총가격과 기준수량으로 단위당 가격(소수점 2자리)을 계산한다.
 * 유효하지 않은 입력이면 null을 반환한다.
 *
 * @param {number|null} price   - 총가격 (예: 제때 priceWithTax)
 * @param {number|null} baseQty - 기준수량 (예: 1000g)
 * @returns {number|null}
 */
export function calcUnitPrice(price, baseQty) {
  if (!price || !baseQty || baseQty <= 0) return null;
  return Math.round((price / baseQty) * 100) / 100;
}
