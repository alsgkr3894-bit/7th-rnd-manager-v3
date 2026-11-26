import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import {
  isInactiveIngredient,
  isIngredientOnOutputMenu,
  markShadowedNames,
} from '@/lib/nutrition/allergen/ingredient-lookup';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export {
  buildAllergenDetailRows,
  buildAllergenSummaryCounts,
  buildIngredientByKey,
} from './allergenPageDetailUtils';
export {
  buildAllergenCsvRows,
  buildAllergenListForOrder,
  buildMenuListForOrder,
  buildMenuNameEditMenus,
} from './allergenPageOutputUtils';

/** 알레르기가 있는 식자재. 단종·제외도 레시피에 남아 있을 수 있어 매트릭스에는 함께 넘긴다. */
export function filterAllergenIngredients(ingredients) {
  return markShadowedNames(ingredients).filter(
    ingredient => asStringArray(ingredient.allergens).length
  );
}

/** 식자재별 보기: 단종·제외 식자재는 출력 메뉴의 레시피에 남아 있을 때만 보여 준다. */
export function filterListedIngredients(allergenIngredients, ingredientToMenus, isExcludedMenu) {
  return asObjectArray(allergenIngredients).filter(
    ingredient =>
      !isInactiveIngredient(ingredient) ||
      isIngredientOnOutputMenu(ingredient, ingredientToMenus, isExcludedMenu)
  );
}

export function filterIngredientRows(allergenIngredients, search) {
  const query = asDisplayText(search).toLowerCase().trim();
  if (!query) return allergenIngredients;
  return allergenIngredients.filter(ingredient => {
    const ingredientAllergens = asStringArray(ingredient.allergens);
    const allergenNames = ALLERGEN_SEED.filter(allergen =>
      ingredientAllergens.includes(allergen.allergenCode)
    )
      .map(allergen => asDisplayText(allergen.allergenName))
      .join(' ');
    return (
      asDisplayText(ingredient.ingredientName).toLowerCase().includes(query) ||
      asDisplayText(ingredient.productCode).toLowerCase().includes(query) ||
      allergenNames.toLowerCase().includes(query)
    );
  });
}

export function orderAllergens(allergenOrder, menuMatrixAll) {
  const safeOrder = asStringArray(allergenOrder);
  if (safeOrder.length) {
    const rank = new Map(safeOrder.map((code, index) => [code, index]));
    return [...ALLERGEN_SEED].sort((a, b) => {
      const aCode = asDisplayText(a.allergenCode);
      const bCode = asDisplayText(b.allergenCode);
      const aRank = rank.has(aCode) ? rank.get(aCode) : Infinity;
      const bRank = rank.has(bCode) ? rank.get(bCode) : Infinity;
      if (aRank !== bRank) return aRank - bRank;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }

  const frequency = new Map();
  for (const row of menuMatrixAll) {
    const codes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
    for (const code of codes) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  }
  return [...ALLERGEN_SEED].sort((a, b) => {
    const aFrequency = frequency.get(asDisplayText(a.allergenCode)) ?? 0;
    const bFrequency = frequency.get(asDisplayText(b.allergenCode)) ?? 0;
    if (bFrequency !== aFrequency) return bFrequency - aFrequency;
    return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
  });
}

export function filterMenuMatrix(menuMatrixAll, search) {
  const query = asDisplayText(search).toLowerCase().trim();
  if (!query) return menuMatrixAll;
  return menuMatrixAll.filter(row => {
    const allergenCodes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
    return (
      asDisplayText(row.menuName).toLowerCase().includes(query) ||
      asDisplayText(row.crust).toLowerCase().includes(query) ||
      ALLERGEN_SEED.filter(allergen => allergenCodes.has(allergen.allergenCode)).some(allergen =>
        asDisplayText(allergen.allergenName).toLowerCase().includes(query)
      )
    );
  });
}
