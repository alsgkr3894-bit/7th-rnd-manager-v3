/**
 * lib/nutrition/label/menu-inputs.js — 영양성분표에 들어가는 메뉴 목록·값 준비(순수 함수).
 * 출력(context.js)과 메뉴 점검(readiness-nutrition-derived.js)이 같은 입력을 쓴다.
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import {
  isBeverageCategory,
  isExtraToppingCategory,
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSideCategory,
} from '@/lib/menu-master/category-policy';

function isLabelMenuCategory(category) {
  return (
    isPizzaCategory(category) ||
    isPersonalPizzaCategory(category) ||
    isSideCategory(category) ||
    isBeverageCategory(category) ||
    isExtraToppingCategory(category)
  );
}

/**
 * 영양성분표의 행 목록은 nutrition_menu_ref만 믿지 않고 메뉴마스터 전체와 합친다.
 * 영양값을 아직 입력하지 않은 신메뉴도 행은 출력하고 값만 '—'로 보여야, 레시피에서
 * 계산한 알레르기와 누락 상태를 표 출력 화면에서 확인할 수 있다.
 */
export function mergeLabelMenuRefs(menuRefs, masters) {
  const merged = new Map();
  for (const ref of asObjectArray(menuRefs)) {
    const code = asDisplayText(ref.menuCode);
    if (code) merged.set(code, ref);
  }
  for (const master of asObjectArray(masters)) {
    const fullCode = asDisplayText(master.menuCode);
    const category = asDisplayText(master.category);
    if (!fullCode || !isLabelMenuCategory(category)) continue;
    const menuCode =
      isPizzaCategory(category) || isPersonalPizzaCategory(category)
        ? getMenuCodeBase(master) || fullCode
        : fullCode;
    const fullName = asDisplayText(master.menuName, menuCode);
    const menuName =
      menuCode === fullCode ? fullName : fullName.replace(/\s+(?:L|R)$/i, '').trim() || fullName;
    if (merged.has(menuCode)) {
      merged.set(menuCode, { ...master, ...merged.get(menuCode), menuCode });
    } else {
      merged.set(menuCode, { ...master, menuCode, menuName, source: 'menu-master' });
    }
  }
  return [...merged.values()];
}

/**
 * "출력 대표 메뉴" 연결(menu_master.outputMenuCode)을 라벨 입력에 적용한다:
 *   - 영양 메뉴 목록: 변형 코드의 행은 대표 코드·이름으로 바꾸고, 대표가 이미 있으면 하나만 남긴다
 *   - 영양성분 값(rawMap): 대표 코드에 값이 없으면 변형 코드의 값을 대표 키로도 쓴다
 *   (알레르기 재료 합집합은 ingredientToMenus를 접어서 처리)
 */
export function applyOutputAliasesToLabelInputs({ menuRefs, rawMap, aliasMap }) {
  if (!aliasMap?.size) return { menuRefs, rawMap };
  const seen = new Set();
  const refs = [];
  const sorted = [...asObjectArray(menuRefs)].sort(
    (a, b) =>
      Number(aliasMap.has(asDisplayText(a.menuCode))) -
      Number(aliasMap.has(asDisplayText(b.menuCode)))
  );
  for (const ref of sorted) {
    const code = asDisplayText(ref.menuCode);
    const rep = aliasMap.get(code);
    const next = rep
      ? { ...ref, menuCode: rep.menuCode, menuName: rep.menuName, variantOf: code }
      : ref;
    const key = asDisplayText(next.menuCode);
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(next);
  }
  const nextRaw = { ...(rawMap || {}) };
  for (const [variant, rep] of aliasMap) {
    for (const key of Object.keys(rawMap || {})) {
      if (!key.startsWith(`${variant}__`)) continue;
      const repKey = `${rep.menuCode}__${key.slice(variant.length + 2)}`;
      if (!nextRaw[repKey]) nextRaw[repKey] = { ...rawMap[key], menuCode: rep.menuCode };
    }
  }
  return { menuRefs: refs, rawMap: nextRaw };
}
