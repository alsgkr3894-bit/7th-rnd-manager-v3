/**
 * lib/cost/margin/calc.js
 * 원가·마진율 순수 계산 함수 (IO 없음 — 단위 테스트 가능)
 */

/**
 * 할인 적용 후 실효 판매가
 */
export function applyDiscount(sellingPrice, discount) {
  if (!sellingPrice || sellingPrice <= 0) return sellingPrice ?? 0;
  if (!discount || !discount.value) return sellingPrice;
  const amt = discount.type === 'pct'
    ? sellingPrice * discount.value / 100
    : discount.value;
  return Math.max(0, sellingPrice - amt);
}

/**
 * 고정 fee 한 항목의 실제 차감액 (사이즈 오버라이드 고려)
 */
function fixedFeeAmount(fee, sizeLabel) {
  if (sizeLabel && fee.sizeOverrides) {
    const override = fee.sizeOverrides[sizeLabel];
    if (override != null && override !== '') return parseFloat(override) || 0;
  }
  return parseFloat(fee.value) || 0;
}

/**
 * 실효 판매가에서 플랫폼 수수료 차감 후 수령액
 */
export function calcNetRevenue(effectivePrice, fees, sizeLabel) {
  if (!effectivePrice || effectivePrice <= 0) return 0;
  let deduction = 0;
  for (const f of (fees || [])) {
    if (f.type === 'fixed') deduction += fixedFeeAmount(f, sizeLabel);
    else if (f.type === 'pct') deduction += effectivePrice * (f.value || 0) / 100;
  }
  return Math.max(0, effectivePrice - deduction);
}

/**
 * 원가율: 원가 / 수령액 × 100
 */
export function calcPlatformMargin(cost, netRevenue) {
  if (!netRevenue || netRevenue <= 0) return null;
  return (cost / netRevenue) * 100;
}
