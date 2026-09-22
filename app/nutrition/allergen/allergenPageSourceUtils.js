import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildDiscontinuedBaseCodeSet,
  isNutritionMenuDiscontinued,
} from '@/lib/nutrition/menu-master-diagnostics';

/**
 * 알레르기 페이지 메뉴 목록 = 메뉴마스터 ∪ 영양 메뉴(nutrition_menu_ref).
 * 영양 메뉴는 base 코드(P-PR-001)에 status가 없어서, 마스터의 L/R(P-PR-001-L/R)이 전부
 * 단종이어도 그대로 두면 "단종 아님"으로 새어 들어가 알레르기 표에 빈 행이 생겼다
 * (2026-09-22: 고구마·흥부박포테이토·고추장불고기·고르곤졸라). 영양성분표와 같은 규칙
 * (buildDiscontinuedBaseCodeSet)으로 단종 상태를 물려준다.
 */
export function combineAllergenMenuSources(menuMasters, menuRefs) {
  const discontinuedBases = buildDiscontinuedBaseCodeSet(menuMasters);
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
  asObjectArray(menuRefs).forEach(ref => {
    const menuCode = asDisplayText(ref?.menuCode);
    const inheritDiscontinued =
      menuCode && !ref?.status && isNutritionMenuDiscontinued(menuCode, discontinuedBases);
    addMenu(inheritDiscontinued ? { ...ref, status: 'discontinued' } : ref);
  });
  return [...map.values()];
}
