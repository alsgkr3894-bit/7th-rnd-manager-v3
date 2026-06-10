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
    id: 'thin-dough-wheat-only',
    edgeCodes: ['씬바사삭L', '씬바사삭R'],
    only: codes(['밀']),
    remove: codes(['대두']),
  },
  {
    id: 'cheese-ring-milk',
    edgeCodes: ['치즈크러스트L', '치즈크러스트R'],
    add: codes(['우유']),
  },
];

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
