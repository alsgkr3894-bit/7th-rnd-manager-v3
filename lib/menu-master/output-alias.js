/**
 * lib/menu-master/output-alias.js — "출력 대표 메뉴" 연결
 *
 * 같은 메뉴인데 매장마다 재료만 다른 경우(예: 오븐 스파게티 — A매장 냉동면, B매장 건면)
 * 메뉴마스터에는 원가·레시피용으로 행이 둘 있지만, 영양성분표·알레르기·원산지 출력에는
 * 한 메뉴로 나가야 한다. 변형 행의 `outputMenuCode`에 대표 메뉴 코드를 적어 두면
 * 출력 단계에서 변형의 재료(알레르기·원산지)를 대표 메뉴에 합치고 변형 행은 따로 내지 않는다.
 * 원가·레시피·판매량 화면은 이 필드를 보지 않는다(2026-09-22 주임님 결정).
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * @returns {Map<string, { menuCode, menuName, category, size }>} 변형 코드 → 대표 메뉴
 */
export function buildOutputAliasMap(menuMasters) {
  const masters = asObjectArray(menuMasters);
  const byCode = new Map(masters.map(m => [asDisplayText(m.menuCode), m]).filter(([code]) => code));
  const aliases = new Map();
  for (const m of masters) {
    const code = asDisplayText(m.menuCode);
    const target = asDisplayText(m.outputMenuCode);
    if (!code || !target || target === code) continue;
    const rep = byCode.get(target);
    if (!rep) continue;
    // 대표가 다시 다른 메뉴를 가리키면 한 단계만 따라간다(순환 방지)
    const repTarget = asDisplayText(rep.outputMenuCode);
    const finalRep =
      repTarget && repTarget !== code && byCode.get(repTarget) ? byCode.get(repTarget) : rep;
    aliases.set(code, {
      menuCode: asDisplayText(finalRep.menuCode),
      menuName: asDisplayText(finalRep.menuName),
      category: asDisplayText(finalRep.category),
      size: asDisplayText(finalRep.size),
    });
  }
  return aliases;
}

export function resolveOutputMenuCode(menuCode, aliasMap) {
  const code = asDisplayText(menuCode);
  return aliasMap?.get(code)?.menuCode || code;
}

export function isOutputVariant(menuCode, aliasMap) {
  return Boolean(aliasMap?.has(asDisplayText(menuCode)));
}

/**
 * buildIngredientMenuMap()의 ingredientToMenus에서 변형 코드를 대표 메뉴로 접는다.
 * 대표 메뉴가 이미 있으면 재료 연결만 합쳐지고(알레르기·원산지 합집합), 없으면 대표
 * 메뉴 메타로 새로 만든다.
 */
export function foldIngredientToMenus(ingredientToMenus, aliasMap) {
  if (!aliasMap?.size || !(ingredientToMenus instanceof Map)) return ingredientToMenus;
  const folded = new Map();
  for (const [key, menus] of ingredientToMenus) {
    if (!(menus instanceof Map)) {
      folded.set(key, menus);
      continue;
    }
    const next = new Map();
    for (const [menuCode, meta] of menus) {
      const rep = aliasMap.get(asDisplayText(menuCode));
      if (!rep) {
        if (!next.has(menuCode)) next.set(menuCode, meta);
        continue;
      }
      const prev = next.get(rep.menuCode);
      next.set(rep.menuCode, {
        ...(meta && typeof meta === 'object' ? meta : {}),
        ...(prev && typeof prev === 'object' ? prev : {}),
        menuName: rep.menuName,
        category: rep.category || prev?.category || meta?.category || '',
      });
    }
    folded.set(key, next);
  }
  return folded;
}

/** 목록에서 변형 행을 뺀다(대표 메뉴 한 행만 남긴다). */
export function dropOutputVariants(menus, aliasMap) {
  if (!aliasMap?.size) return asObjectArray(menus);
  return asObjectArray(menus).filter(m => !aliasMap.has(asDisplayText(m.menuCode)));
}
