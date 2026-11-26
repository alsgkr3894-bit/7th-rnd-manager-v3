import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export function normStr(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

function unique(values) {
  return [...new Set(values.map(value => asDisplayText(value).trim()).filter(Boolean))];
}

export function codeKeyVariants(productCode) {
  const code = asDisplayText(productCode).trim();
  if (!code) return [];
  return unique([`code:${code}`, `code:${code.toLowerCase()}`, `code:${code.toUpperCase()}`]);
}

export function nameKeyVariants(...values) {
  return unique(values)
    .map(value => normStr(value))
    .filter(Boolean)
    .map(value => `name:${value}`);
}

export function ingredientNameValues(ingredient) {
  return unique([
    ingredient?.ingredientName,
    ingredient?.displayName,
    ingredient?.productName,
    ingredient?.name,
  ]);
}

export function componentNameValues(component) {
  return unique([
    component?.ingredientName,
    component?.displayName,
    component?.productName,
    component?.name,
    component?.toppingName,
    component?.menuName,
  ]);
}

export function isInactiveIngredient(ingredient) {
  return Boolean(ingredient?.discontinued || ingredient?.excluded);
}

/** 이 식자재를 찾을 수 있는 조회 키. 다른 식자재에 가려진 이름 키는 뺀다. */
export function ingredientLookupKeys(ingredient) {
  const shadowed = new Set(asStringArray(ingredient?.shadowedNameKeys));
  return [
    ...codeKeyVariants(ingredient?.productCode),
    ...nameKeyVariants(...ingredientNameValues(ingredient)).filter(key => !shadowed.has(key)),
  ];
}

/**
 * 단종·제외 식자재도 레시피에 남아 있으면 표시에 포함한다. 다만 사용 중 식자재와 이름이
 * 같으면 그 이름 조회는 사용 중 식자재의 것이라, 단종·제외 쪽에 가려진 이름을 적어 둔다.
 * 사용 중 식자재까지 포함한 전체 목록에 대고 불러야 한다(걸러낸 뒤에는 판정할 수 없다).
 */
export function markShadowedNames(ingredients) {
  const list = asObjectArray(ingredients);
  const activeNames = new Set(
    list
      .filter(ingredient => !isInactiveIngredient(ingredient))
      .flatMap(ingredient => nameKeyVariants(...ingredientNameValues(ingredient)))
  );
  return list.map(ingredient => {
    if (!isInactiveIngredient(ingredient)) return ingredient;
    const shadowed = nameKeyVariants(...ingredientNameValues(ingredient)).filter(key =>
      activeNames.has(key)
    );
    if (!shadowed.length) return ingredient;
    return {
      ...ingredient,
      shadowedNameKeys: unique([...asStringArray(ingredient.shadowedNameKeys), ...shadowed]),
    };
  });
}

/** 출력에서 빠지지 않은 메뉴의 레시피가 이 식자재를 가리키는가 */
export function isIngredientOnOutputMenu(ingredient, ingredientToMenus, isExcludedMenu) {
  return ingredientLookupKeys(ingredient).some(key => {
    const menus = ingredientToMenus?.get?.(key);
    if (!(menus instanceof Map)) return false;
    return [...menus].some(([menuCode, meta]) => !isExcludedMenu?.(menuCode, meta?.menuName));
  });
}

export function addIngredientLookupKeys(map, ingredient) {
  if (!(map instanceof Map) || !ingredient) return map;
  for (const key of ingredientLookupKeys(ingredient)) map.set(key, ingredient);
  return map;
}

export function buildIngredientLookup(ingredients, options = {}) {
  const requireAllergens = options.requireAllergens !== false;
  const map = new Map();
  const marked = markShadowedNames(ingredients);

  // 단종·제외를 먼저 넣어, 키가 겹치면 사용 중 식자재가 덮는다.
  for (const ingredient of [
    ...marked.filter(isInactiveIngredient),
    ...marked.filter(item => !isInactiveIngredient(item)),
  ]) {
    if (requireAllergens && !asStringArray(ingredient.allergens).length) continue;
    addIngredientLookupKeys(map, ingredient);
  }

  return map;
}

export function findIngredientByComponent(lookup, component) {
  if (!(lookup instanceof Map) || !component) return null;
  for (const key of codeKeyVariants(component.productCode)) {
    const ingredient = lookup.get(key);
    if (ingredient) return ingredient;
  }
  for (const key of nameKeyVariants(...componentNameValues(component))) {
    const ingredient = lookup.get(key);
    if (ingredient) return ingredient;
  }
  return null;
}
