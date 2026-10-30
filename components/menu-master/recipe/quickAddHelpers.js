// 레시피 "식자재 빠른 추가" 패널에서 쓰는 순수 헬퍼들.
// MenuRecipeSection.jsx / hooks/useMenuRecipeQuickAdd.js에서 공용으로 사용한다.

export function normalizeIngredientSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s/g, '');
}

export function ingredientSearchText(ingredient) {
  return normalizeIngredientSearchText(
    `${ingredient?.ingredientName || ''} ${ingredient?.productCode || ''}`
  );
}

export function formatQuickPrice(info) {
  if (info?.unitPrice == null) return '단가 없음';
  const unit = info.baseUnitType || 'g';
  return `${Number(info.unitPrice).toLocaleString()}원/${unit}`;
}

export function quickQuantityValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? text : '';
}

/**
 * 식자재 검색 결과 정렬·자르기. 정확히 같은 이름 → 이름이 검색어로 시작 → 이름에 포함 → 제품코드 일치
 * 순으로 앞에 두고, 같은 순위 안에서는 검색어가 이름 앞쪽에 있고 이름이 짧은 것을 먼저 둔다. 등록
 * 순서대로 잘라 쓰면 '양파'를 입력해도 '적양파'가 먼저 나와 Enter가 엉뚱한 식자재를 고르던 문제를 막는다.
 *
 * @param {object[]} ingredients - 후보 식자재(단종·제외는 호출 쪽에서 미리 거른다)
 * @param {string} query - 입력값
 * @param {number} [limit]
 */
export function rankIngredientSuggestions(ingredients, query, limit = 8) {
  const q = normalizeIngredientSearchText(query);
  if (!q) return [];
  const ranked = [];
  (Array.isArray(ingredients) ? ingredients : []).forEach((ingredient, index) => {
    const name = normalizeIngredientSearchText(ingredient?.ingredientName);
    const code = normalizeIngredientSearchText(ingredient?.productCode);
    let rank;
    let position = 0;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) {
      rank = 2;
      position = name.indexOf(q);
    } else if (code.includes(q)) rank = 3;
    else return;
    ranked.push({ ingredient, rank, position, length: name.length, index });
  });
  // 같은 순위 안에서는 검색어가 이름 앞쪽에 있고 이름이 짧은 것(= 더 가까운 이름)을 먼저 둔다
  ranked.sort(
    (a, b) => a.rank - b.rank || a.position - b.position || a.length - b.length || a.index - b.index
  );
  return ranked.slice(0, limit).map(item => item.ingredient);
}
