/** 레시피 구성품 단가를 "g당 3.25원", "개당 450원"처럼 표시한다. */
export function formatRecipeUnitPrice(unitPrice, unit = 'g') {
  if (unitPrice == null || unitPrice === '') return '—';
  const price = Number(unitPrice);
  if (!Number.isFinite(price)) return '—';
  const rounded = Math.round(price * 10000) / 10000;
  const safeUnit = String(unit || 'g').trim() || 'g';
  const priceText = rounded.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  return `${safeUnit}당 ${priceText}원`;
}
