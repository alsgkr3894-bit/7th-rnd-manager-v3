/**
 * 단종 식자재가 레시피에 남아 있는 메뉴 수 — 메뉴마스터 상단 경고 배너가 쓴다.
 * 메뉴 코드별로 한 번만 세고, 단종 메뉴 자체는 요약 단계에서 이미 빠진다.
 */
export function countMenusWithDiscontinuedIngredients(rows, recipeSummaryMap) {
  let count = 0;
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = String(row?.menuCode ?? '').trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const names = recipeSummaryMap?.get?.(code)?.discontinuedIngredientNames;
    if (Array.isArray(names) && names.length > 0) count += 1;
  }
  return count;
}
