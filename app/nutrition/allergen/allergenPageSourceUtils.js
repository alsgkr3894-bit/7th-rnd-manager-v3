import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function combineAllergenMenuSources(menuMasters, menuRefs) {
  const map = new Map();
  const addMenu = menu => {
    const menuCode = asDisplayText(menu?.menuCode);
    const menuName = asDisplayText(menu?.menuName);
    if (!menuCode && !menuName) return;
    const key = menuCode || `name:${menuName}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...menu, menuCode, menuName });
      return;
    }
    map.set(key, {
      ...menu,
      ...prev,
      menuCode: prev.menuCode || menuCode,
      menuName: prev.menuName || menuName,
      category: asDisplayText(prev.category) || asDisplayText(menu?.category),
      size: asDisplayText(prev.size) || asDisplayText(menu?.size),
    });
  };

  asObjectArray(menuMasters).forEach(addMenu);
  asObjectArray(menuRefs).forEach(addMenu);
  return [...map.values()];
}
