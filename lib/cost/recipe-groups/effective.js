import { groupAppliesToCategory } from '@/lib/cost/recipe-groups/apply';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { asDisplayText, asFiniteNumber, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

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

function groupIngredientQuantity(line, sizeLabel) {
  const quantities = line?.quantities && typeof line.quantities === 'object' ? line.quantities : {};
  return asFiniteNumber(quantities[sizeLabel], null);
}

export function buildAppliedRecipeGroupComponents(menu, groups = []) {
  const sizeLabel = menuSizeLabel(menu);
  const components = [];

  for (const group of asObjectArray(groups)) {
    if (!groupAppliesToMenu(group, menu)) continue;
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
