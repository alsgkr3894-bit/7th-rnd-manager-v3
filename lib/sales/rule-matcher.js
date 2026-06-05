/**
 * lib/sales/rule-matcher.js — 정규화된 메뉴명을 SALES_RULES와 매칭
 *
 * 책임:
 * - SALES_RULES를 순서대로 검사 → 첫 매칭 규칙 반환 또는 null
 *
 * 금지:
 * - 정규화 로직 / 별칭 치환 / DB 조회 / issue 생성 / status 판정
 */

import { SALES_RULES } from './classify-rules.js';
import { getActiveBrandId } from '@/lib/active-brand';

export function matchRule(name) {
  if (!name || typeof name !== 'string') return null;
  // 정적 규칙은 7번가(main) 전용. 다른 브랜드는 DB 사용자 규칙만 사용(빈 시작).
  if (getActiveBrandId() !== 'main') return null;

  for (const rule of SALES_RULES) {
    if (rule.matchType === 'exact') {
      if (rule.pattern === name) return rule;
    } else if (rule.matchType === 'pattern') {
      if (rule.pattern instanceof RegExp && rule.pattern.test(name)) return rule;
    }
  }
  return null;
}
