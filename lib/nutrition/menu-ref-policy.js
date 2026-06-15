import { normalizeNutritionCategory } from '@/lib/nutrition/menu-group';

const text = value => String(value ?? '').trim();

export function buildNutritionMenuRefPayload(form = {}) {
  const menuCode = text(form.menuCode);
  if (!menuCode) throw new Error('메뉴마스터에서 메뉴를 선택하세요');

  const menuName = text(form.menuName);
  if (!menuName) throw new Error('메뉴명 입력 필요');

  const payload = {
    ...form,
    menuCode,
    menuName,
    category: normalizeNutritionCategory(form.category, '피자'),
  };

  if (form.displayOrder !== '' && form.displayOrder != null) {
    payload.displayOrder = Number(form.displayOrder);
  } else {
    delete payload.displayOrder;
  }

  return payload;
}
