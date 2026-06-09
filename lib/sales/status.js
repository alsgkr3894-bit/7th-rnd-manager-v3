/**
 * lib/sales/status.js — 규칙 매칭 결과를 status로 판정
 *
 * 책임:
 * - status: classified / excluded / unclassified 판정
 * - issue 감지: hasExcludeCandidate / hasUnmatched
 */

export const STATUS_ENUM = {
  CLASSIFIED: 'classified',
  EXCLUDED: 'excluded',
  UNCLASSIFIED: 'unclassified',
};

/**
 * 판정 우선순위:
 *   1. exclusionDecision === 'excluded'         → excluded
 *   2. exclusionDecision === 'exclude_candidate' → unclassified + hasExcludeCandidate
 *   3a. matchedRule.category === '품목제외'      → excluded
 *   3b. matchedRule 존재                          → classified
 *   4. 그 외                                     → unclassified + hasUnmatched
 */
export function classifyMenuStatus(input) {
  if (!input || typeof input !== 'object') {
    return unclassifiedResult(true);
  }

  const { matchedRule, exclusionDecision } = input;

  if (exclusionDecision === 'excluded') {
    return excludedResult(null, null, null);
  }

  if (exclusionDecision === 'exclude_candidate') {
    return {
      status: STATUS_ENUM.UNCLASSIFIED,
      category: null,
      groupName: null,
      detailName: null,
      issues: { hasExcludeCandidate: true, hasUnmatched: false },
    };
  }

  if (matchedRule && typeof matchedRule === 'object') {
    if (matchedRule.category === '품목제외') {
      return excludedResult(
        matchedRule.category,
        matchedRule.groupName ?? null,
        matchedRule.detailName ?? null
      );
    }
    return {
      status: STATUS_ENUM.CLASSIFIED,
      category: matchedRule.category ?? null,
      groupName: matchedRule.groupName ?? null,
      detailName: matchedRule.detailName ?? null,
      issues: { hasExcludeCandidate: false, hasUnmatched: false },
    };
  }

  return unclassifiedResult(true);
}

function excludedResult(category, groupName, detailName) {
  return {
    status: STATUS_ENUM.EXCLUDED,
    category,
    groupName,
    detailName,
    issues: { hasExcludeCandidate: false, hasUnmatched: false },
  };
}

function unclassifiedResult(hasUnmatched) {
  return {
    status: STATUS_ENUM.UNCLASSIFIED,
    category: null,
    groupName: null,
    detailName: null,
    issues: { hasExcludeCandidate: false, hasUnmatched },
  };
}
