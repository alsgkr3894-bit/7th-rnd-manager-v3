import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const ALLERGEN_NAME = Object.fromEntries(
  ALLERGEN_SEED.map(({ allergenCode, allergenName }) => [allergenCode, allergenName])
);
// 최종 출력 알레르기 목록을 ALLERGEN_SEED의 기본 표시 순서로 정렬하기 위한 이름→순번 맵.
const ALLERGEN_ORDER_BY_NAME = Object.fromEntries(
  ALLERGEN_SEED.map(({ allergenName }, index) => [allergenName, index])
);
function allergenOrderOf(name) {
  return name in ALLERGEN_ORDER_BY_NAME ? ALLERGEN_ORDER_BY_NAME[name] : Number.MAX_SAFE_INTEGER;
}
function sortByAllergenOrder(names) {
  return [...names].sort((a, b) => allergenOrderOf(a) - allergenOrderOf(b));
}

function normalizeKey(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s/g, '');
}

function unique(values) {
  return [...new Set(values.map(value => asDisplayText(value).trim()).filter(Boolean))];
}

function componentName(component) {
  return (
    asDisplayText(component?.ingredientName).trim() ||
    asDisplayText(component?.productCode).trim() ||
    '이름 없는 구성품'
  );
}

function buildIngredientLookup(ingredients = []) {
  const byCode = new Map();
  const byName = new Map();

  for (const ingredient of asObjectArray(ingredients)) {
    const codeKey = normalizeKey(ingredient?.productCode);
    if (codeKey) byCode.set(codeKey, ingredient);
    [
      ingredient?.ingredientName,
      ingredient?.displayName,
      ingredient?.productName,
      ingredient?.name,
    ].forEach(name => {
      const nameKey = normalizeKey(name);
      if (nameKey) byName.set(nameKey, ingredient);
    });
  }

  return { byCode, byName };
}

function findIngredient(component, lookup) {
  const codeKey = normalizeKey(component?.productCode);
  if (codeKey && lookup.byCode.has(codeKey)) return lookup.byCode.get(codeKey);
  for (const name of [
    component?.ingredientName,
    component?.displayName,
    component?.productName,
    component?.name,
  ]) {
    const nameKey = normalizeKey(name);
    if (nameKey && lookup.byName.has(nameKey)) return lookup.byName.get(nameKey);
  }
  return null;
}

function originLabels(ingredient) {
  if (ingredient?.originHidden === true) return [];
  return asObjectArray(ingredient?.origin)
    .map(item => {
      const displayName = asDisplayText(item?.displayName).trim();
      const country = asDisplayText(item?.country).trim();
      if (!country) return '';
      return displayName ? `${displayName} ${country}` : country;
    })
    .filter(Boolean);
}

function allergenLabels(ingredient) {
  return asStringArray(ingredient?.allergens)
    .map(code => ALLERGEN_NAME[code] || code)
    .filter(Boolean);
}

export function buildRecipeImpactPreview(components = [], ingredients = []) {
  const lookup = buildIngredientLookup(ingredients);
  const directComponents = asObjectArray(components).filter(
    component =>
      asDisplayText(component?.ingredientName).trim() ||
      asDisplayText(component?.productCode).trim()
  );
  // components에는 직접 구성품 + 공통원가(체크된 공통묶음) 식자재가 함께 들어온다.
  // 공통원가에서 온 개수를 따로 세어 "구성품 N개(공통원가 M개 포함)" 표기에 쓴다.
  const groupComponentCount = directComponents.filter(
    component => component?.source === 'recipe-group'
  ).length;

  const missingOriginNames = [];
  const missingAllergenNames = [];
  const unmatchedNames = [];
  const originOutputLabels = [];
  const allergenOutputLabels = [];
  let linkedIngredientCount = 0;
  let originRegisteredCount = 0;
  let allergenRegisteredCount = 0;

  for (const component of directComponents) {
    const name = componentName(component);
    const ingredient = findIngredient(component, lookup);
    if (!ingredient) {
      unmatchedNames.push(name);
      missingOriginNames.push(name);
      missingAllergenNames.push(name);
      continue;
    }

    linkedIngredientCount += 1;

    const origins = originLabels(ingredient);
    if (origins.length) {
      originRegisteredCount += 1;
      originOutputLabels.push(...origins);
    } else {
      missingOriginNames.push(name);
    }

    const allergens = allergenLabels(ingredient);
    if (allergens.length) {
      allergenRegisteredCount += 1;
      allergenOutputLabels.push(...allergens);
    } else {
      missingAllergenNames.push(name);
    }
  }

  return {
    componentCount: directComponents.length,
    groupComponentCount,
    linkedIngredientCount,
    originRegisteredCount,
    allergenRegisteredCount,
    missingOriginNames: unique(missingOriginNames),
    missingAllergenNames: unique(missingAllergenNames),
    unmatchedNames: unique(unmatchedNames),
    originOutputLabels: unique(originOutputLabels),
    allergenOutputLabels: sortByAllergenOrder(unique(allergenOutputLabels)),
  };
}
