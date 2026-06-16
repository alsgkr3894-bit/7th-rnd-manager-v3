import { groupAppliesToCategory } from '@/lib/cost/recipe-groups/apply';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import {
  asArray,
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
  asStringArray,
} from '@/lib/ui/prop-guards';

function normalizeSizeLabel(value) {
  return asDisplayText(value).trim() || '단일';
}

function menuSizeLabel(menu) {
  const explicit = normalizeSizeLabel(menu?.size);
  if (explicit !== '단일') return explicit;
  return normalizeSizeLabel(parseMenuCode(menu?.menuCode)?.size);
}

function groupSizeLabels(group) {
  return asStringArray(group?.sizes).map(normalizeSizeLabel).filter(Boolean);
}

export function groupAppliesToMenu(group, menu) {
  if (!groupAppliesToCategory(group, asDisplayText(menu?.category))) return false;
  const sizes = groupSizeLabels(group);
  if (!sizes.length) return true;
  return sizes.includes(menuSizeLabel(menu));
}

export function normalizeRecipeGroupIds(groupIds) {
  return [
    ...new Set(
      asArray(groupIds)
        .map(value => asDisplayText(value).trim())
        .filter(Boolean)
    ),
  ];
}

export function eligibleRecipeGroupsForMenu(menu, groups = []) {
  return asObjectArray(groups).filter(group => groupAppliesToMenu(group, menu));
}

function groupIngredientQuantity(line, sizeLabel) {
  const quantities = line?.quantities && typeof line.quantities === 'object' ? line.quantities : {};
  return asFiniteNumber(quantities[sizeLabel], null);
}

export function buildAppliedRecipeGroupComponents(menu, groups = [], selectedGroupIds = []) {
  const sizeLabel = menuSizeLabel(menu);
  const selectedIds = new Set(normalizeRecipeGroupIds(selectedGroupIds));
  if (selectedIds.size === 0) return [];

  const components = [];

  for (const group of eligibleRecipeGroupsForMenu(menu, groups)) {
    if (!selectedIds.has(asDisplayText(group.id).trim())) continue;
    for (const line of asObjectArray(group.ingredients)) {
      const productCode = asDisplayText(line?.productCode);
      const ingredientName = asDisplayText(line?.ingredientName);
      if (!productCode && !ingredientName) continue;
      components.push({
        productCode,
        ingredientName,
        quantity: groupIngredientQuantity(line, sizeLabel),
        unit: normalizeCostBaseUnit(line?.unitType || line?.unit || 'g'),
        unitPrice: asFiniteNumber(line?.unitPrice, null),
        source: 'recipe-group',
        groupId: group.id ?? null,
        groupName: asDisplayText(group.name),
      });
    }
  }

  return components;
}

export function buildEffectiveRecipeComponents(menu, recipe, groups = []) {
  const directComponents = asObjectArray(recipe?.components);
  const commonComponents = buildAppliedRecipeGroupComponents(
    menu,
    groups,
    recipe?.selectedRecipeGroupIds
  );
  return [...directComponents, ...commonComponents];
}
