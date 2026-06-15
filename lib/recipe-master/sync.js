import {
  isBeverageCategory,
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSetCategory,
  isSideCategory,
} from '@/lib/menu-master/category-policy';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';

export function recipeStoreKindForCategory(category) {
  if (isPersonalPizzaCategory(category)) return 'personal';
  if (isSetCategory(category)) return 'set';
  if (isSideCategory(category) || isBeverageCategory(category)) return 'side';
  if (isPizzaCategory(category)) return 'pizza';
  return null;
}

export function normalizeRecipeMasterComponents(components) {
  return (Array.isArray(components) ? components : [])
    .map(component => ({
      productCode: String(component?.productCode || '').trim() || null,
      ingredientName: String(component?.ingredientName || '').trim(),
      quantity:
        component?.quantity != null && component.quantity !== ''
          ? Number(component.quantity)
          : null,
      unit: normalizeCostBaseUnit(component?.unit),
      unitPrice:
        component?.unitPrice != null && component.unitPrice !== ''
          ? Number(component.unitPrice)
          : null,
      note: String(component?.note || '').trim(),
    }))
    .filter(component => component.productCode || component.ingredientName);
}

export function buildRecipeMasterRecipePayload(source, components = []) {
  const size = String(source?.size || '').trim();
  return {
    menuCode: String(source?.menuCode || '').trim(),
    menuName: String(source?.menuName || '').trim(),
    size: size && size !== '단일' ? size : '단일',
    components: normalizeRecipeMasterComponents(components),
    note: String(source?.note || '').trim(),
  };
}

export function buildMissingRecipeSkeletons({ menuRows, recipeMaps }) {
  return (Array.isArray(menuRows) ? menuRows : [])
    .map(menu => {
      const kind = recipeStoreKindForCategory(menu?.category);
      const menuCode = String(menu?.menuCode || '').trim();
      if (!kind || !menuCode || recipeMaps?.[kind]?.has(menuCode)) return null;
      return {
        kind,
        payload: buildRecipeMasterRecipePayload({ ...menu, note: '' }),
      };
    })
    .filter(Boolean);
}

export function recipeSyncTargetLabel(kind) {
  if (kind === 'pizza') return '피자 원가';
  if (kind === 'personal') return '1인피자 원가';
  if (kind === 'set') return '세트 원가';
  if (kind === 'side') return '사이드 원가';
  return '미지원';
}

export function buildRecipeMasterMenuPayload(draft) {
  return {
    id: draft?.menuId,
    menuCode: String(draft?.menuCode || '').trim(),
    menuName: String(draft?.menuName || '').trim(),
    category: String(draft?.category || '').trim(),
    size: draft?.size && draft.size !== '단일' ? String(draft.size).trim() : null,
    price: draft?.price != null && draft.price !== '' ? Number(draft.price) : null,
    status: draft?.status || 'active',
    source: 'recipe-master',
    note: String(draft?.note || '').trim(),
  };
}
