/**
 * lib/sales/suggest.js — 미매칭 메뉴 → 기존 룰 자동 추천
 *
 * 입력 메뉴명을 토큰으로 분해 후, SALES_RULES에서 groupName/detailName/pattern과
 * substring 매칭되는 룰을 찾아 상위 N개 제안.
 */

import { SALES_RULES } from './classify-rules.js';
import { getUserRules } from './store-user-rules.js';

/**
 * 규칙 등록 폼 자동완성용 — 기존 중분류명(groupName)·상세명(detailName) 후보 목록.
 * 정적 규칙(SALES_RULES) + 사용자 정의 규칙(DB)을 합쳐 중복 제거 후 가나다순 정렬.
 *
 * 예) 입력창에 "스파" 입력 시 datalist가 "오븐스파게티" 등 기존 값을 제안.
 *
 * @returns {Promise<{ groupNames: string[], detailNames: string[] }>}
 */
export async function getClassificationNameOptions() {
  const groups = new Set();
  const details = new Set();
  for (const r of SALES_RULES) {
    if (r?.groupName)  groups.add(r.groupName);
    if (r?.detailName) details.add(r.detailName);
  }
  try {
    const userRules = await getUserRules();
    for (const r of userRules) {
      if (r?.enable === false) continue;
      if (r?.groupName)  groups.add(r.groupName);
      if (r?.detailName) details.add(r.detailName);
    }
  } catch { /* DB 미초기화 등은 정적 목록만 사용 */ }

  const sortKo = (a, b) => a.localeCompare(b, 'ko');
  return {
    groupNames:  Array.from(groups).sort(sortKo),
    detailNames: Array.from(details).sort(sortKo),
  };
}

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
