/**
 * lib/sales/alias.js — 정적 별칭 매핑 (사용자 추가 별칭은 DB에서 별도)
 *
 * 파이프라인:
 *   rawMenuName → normalizeMenuName() → mapAlias() ← 이 단계 → matchRule()
 */

export const SALES_ALIASES = [
  {
    aliasId: 'alias_pizza_001',
    inputName: '뉴더블 피자',
    outputName: '뉴더블치즈피자',
    description: 'rule_pizza_001 매칭용 표기 통일',
  },
  {
    aliasId: 'alias_sauce_001',
    inputName: '치즈가루',
    outputName: '파마산',
    description: 'rule_sauce_001 매칭용 동의어 정규화',
  },
  {
    aliasId: 'alias_sauce_002',
    inputName: '파마산추가',
    outputName: '파마산',
    description: 'rule_sauce_001 매칭용 접미사 제거',
  },
];

import { getActiveBrandId } from '@/lib/active-brand';

/**
 * 정규화된 메뉴명을 표준 메뉴명으로 매핑.
 * 매칭되면 outputName, 아니면 원본 반환.
 * 정적 별칭은 7번가(main) 전용 — 다른 브랜드는 DB 사용자 별칭만 사용.
 */
export function mapAlias(name) {
  if (typeof name !== 'string') return name;
  if (getActiveBrandId() !== 'main') return name;
  const alias = SALES_ALIASES.find(a => a.inputName === name);
  return alias ? alias.outputName : name;
}
