/**
 * lib/nutrition/allergen/rules.js — 엣지·도우 알레르기 보정 규칙
 *
 * 출력 컴포넌트에 알레르기 문자열을 직접 고정하지 않고, edgeCode 단위 규칙으로
 * 추가(add)·제외(remove)·치환(only)을 적용한다.
 */

import { ALLERGEN_SEED } from './store';
import { asDisplayText } from '@/lib/ui/prop-guards';

const codeByName = Object.fromEntries(
  ALLERGEN_SEED.map(a => [asDisplayText(a.allergenName), asDisplayText(a.allergenCode)])
);

function codes(names = []) {
  return names.map(name => codeByName[name]).filter(Boolean);
}

export const EDGE_ALLERGEN_RULES = [
  {
    id: 'thin-dough-without-soy',
    edgeCodes: ['씬바사삭L'],
    remove: codes(['대두']),
  },
  {
    id: 'cheese-ring-milk',
    edgeCodes: ['치즈크러스트L', '치즈크러스트R'],
    add: codes(['우유']),
  },
];

/**
 * 특정 메뉴의 특정 크러스트(엣지코드)에서만 적용되는 예외 규칙.
 * EDGE_ALLERGEN_RULES는 해당 엣지코드를 쓰는 모든 메뉴에 전역 적용되지만,
 * 도우 자체가 바뀌어 알레르기가 달라지는 등 "이 메뉴만" 다른 경우는 menuNameIncludes
 * (또는 menuCodes)로 대상을 좁혀 여기에 등록한다.
 * 예: 고르곤졸라는 씬도우로 바꾸면 도우 자체가 달라져 대두가 빠진다.
 */
export const MENU_EDGE_ALLERGEN_RULES = [
  {
    id: 'gorgonzola-thin-dough-without-soy',
    menuNameIncludes: ['고르곤졸라'],
    edgeCodes: ['씬바사삭L'],
    remove: codes(['대두']),
  },
];

function ruleMatchesMenu(rule, menuCode, menuName) {
  if (Array.isArray(rule.menuCodes) && rule.menuCodes.length) {
    if (!rule.menuCodes.includes(asDisplayText(menuCode))) return false;
  }
  if (Array.isArray(rule.menuNameIncludes) && rule.menuNameIncludes.length) {
    const name = asDisplayText(menuName);
    if (!rule.menuNameIncludes.some(part => name.includes(part))) return false;
  }
  return true;
}

export function applyEdgeAllergenRules(edgeCode, inputSet) {
  const code = asDisplayText(edgeCode);
  const next = inputSet instanceof Set ? new Set(inputSet) : new Set();
  for (const rule of EDGE_ALLERGEN_RULES) {
    if (!rule.edgeCodes.includes(code)) continue;
    if (Array.isArray(rule.only) && rule.only.length) {
      next.clear();
      rule.only.forEach(allergenCode => next.add(allergenCode));
    }
    (rule.remove || []).forEach(allergenCode => next.delete(allergenCode));
    (rule.add || []).forEach(allergenCode => next.add(allergenCode));
  }
  return next;
}

export function applyAllEdgeAllergenRules(map) {
  const next = map instanceof Map ? new Map(map) : new Map();
  for (const rule of EDGE_ALLERGEN_RULES) {
    for (const edgeCode of rule.edgeCodes) {
      next.set(edgeCode, applyEdgeAllergenRules(edgeCode, next.get(edgeCode)));
    }
  }
  return next;
}

/**
 * 메뉴+엣지코드 단위 예외 규칙을 최종 병합 셋(기본 레시피 + 엣지)에 적용한다.
 * EDGE_ALLERGEN_RULES와 달리 menuCode/menuName까지 확인해 특정 메뉴에만 적용되고,
 * 기본 레시피에서 온 알레르기도 제거할 수 있다(엣지 버킷만 건드리는 위 함수들과의 차이).
 */
export function applyMenuEdgeAllergenRules(menuCode, menuName, edgeCode, inputSet) {
  const code = asDisplayText(edgeCode);
  const next = inputSet instanceof Set ? new Set(inputSet) : new Set();
  if (!code) return next;
  for (const rule of MENU_EDGE_ALLERGEN_RULES) {
    if (!rule.edgeCodes.includes(code)) continue;
    if (!ruleMatchesMenu(rule, menuCode, menuName)) continue;
    if (Array.isArray(rule.only) && rule.only.length) {
      next.clear();
      rule.only.forEach(allergenCode => next.add(allergenCode));
    }
    (rule.remove || []).forEach(allergenCode => next.delete(allergenCode));
    (rule.add || []).forEach(allergenCode => next.add(allergenCode));
  }
  return next;
}
