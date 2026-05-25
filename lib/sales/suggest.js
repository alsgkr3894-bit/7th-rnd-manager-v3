/**
 * lib/sales/suggest.js — 미매칭 메뉴 → 기존 룰 자동 추천
 *
 * 입력 메뉴명을 토큰으로 분해 후, SALES_RULES에서 groupName/detailName/pattern과
 * substring 매칭되는 룰을 찾아 상위 N개 제안.
 */

import { SALES_RULES } from './classify-rules.js';

/**
 * @param {string} menuName — 정규화된 메뉴명 (예: "고구마피자 변경")
 * @param {number} limit — 추천 개수 (기본 5)
 * @returns {Array<{ rule: object, score: number }>}
 */
export function suggestRulesByMenuName(menuName, limit = 5) {
  if (!menuName || typeof menuName !== 'string') return [];
  const tokens = extractTokens(menuName);
  if (tokens.length === 0) return [];

  const scored = new Map(); // ruleId → { rule, score }

  for (const rule of SALES_RULES) {
    if (!rule || typeof rule.pattern !== 'string') continue; // 정규식은 skip
    const pattern = rule.pattern;
    const groupName = rule.groupName || '';
    const detailName = rule.detailName || '';

    let score = 0;
    for (const tk of tokens) {
      if (pattern.includes(tk))   score += 3;
      if (groupName.includes(tk)) score += 2;
      if (detailName.includes(tk)) score += 1;
    }
    if (score === 0) continue;
    scored.set(rule.ruleId, { rule, score });
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 메뉴명에서 의미 있는 토큰 추출.
 *   - 공백/+/() 등 분리자로 split
 *   - 2자 이상만
 *   - 흔한 후행 토큰(변경/추가/선택) 제거
 */
function extractTokens(menuName) {
  const stopWords = new Set(['변경', '추가', '선택', '피자', 'L', 'R', 'P', '세트']);
  return menuName
    .split(/[\s+,()\/]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !stopWords.has(t));
}
