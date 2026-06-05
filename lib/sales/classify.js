/**
 * lib/sales/classify.js — 검증 완료 행 분류 파이프라인 (순수 함수)
 *
 * rawMenuName → normalize → alias → matchRule → classifyStatus → classified row + issue
 *
 * 호출 측이 classifier(DB 동적 규칙 캐시)를 주입하면 그 규칙 우선 사용.
 * classifier=null 이면 정적 규칙(SALES_RULES, SALES_ALIASES)만 사용.
 */

import { normalizeMenuName } from './normalize.js';
import { mapAlias } from './alias.js';
import { matchRule } from './rule-matcher.js';
import { classifyMenuStatus } from './status.js';

/**
 * @param {Array} validRows — [{ rawMenuName, quantity, originalIndex }, ...]
 * @param {number} year, month — 기록용 (저장 시 호출자가 주입)
 * @param {object|null} classifier — { mapAlias, matchRule, isExcluded } 또는 null
 *
 * @returns {{ classifiedRows, groupedIssues }}
 */
export function classifyAndPrepare(validRows, year, month, classifier = null) {
  if (!Array.isArray(validRows) || validRows.length === 0) {
    return { classifiedRows: [], groupedIssues: [] };
  }

  const classifiedRows = [];
  const issueMap = {};

  validRows.forEach((row, idx) => {
    const normalizedMenuName = normalizeMenuName(row.rawMenuName);
    const mappedMenuName = classifier
      ? classifier.mapAlias(normalizedMenuName)
      : mapAlias(normalizedMenuName);
    const matchedRule = classifier
      ? classifier.matchRule(mappedMenuName)
      : matchRule(mappedMenuName);

    let exclusionDecision = null;
    if (classifier && classifier.isExcluded?.(normalizedMenuName)) {
      exclusionDecision = 'excluded';
    }

    const result = classifyMenuStatus({
      rawMenuName: row.rawMenuName,
      normalizedMenuName, mappedMenuName,
      matchedRule, exclusionDecision,
    });

    classifiedRows.push({
      rawMenuName: row.rawMenuName,
      normalizedMenuName, mappedMenuName,
      quantity: row.quantity,
      originalIndex: row.originalIndex,
      status: result.status,
      category: result.category,
      groupName: result.groupName,
      detailName: result.detailName,
    });

    // unmatched issue만 그룹화
    if (result.issues.hasUnmatched) {
      const key = `unmatched|${normalizedMenuName}`;
      if (!issueMap[key]) {
        issueMap[key] = {
          issueType: 'unmatched',
          normalizedMenuName,
          representativeRawMenuName: row.rawMenuName,
          totalQuantity: 0,
          affectedRowCount: 0,
          relatedRowPositions: [],
          status: 'open',
        };
      }
      issueMap[key].totalQuantity += row.quantity;
      issueMap[key].affectedRowCount += 1;
      issueMap[key].relatedRowPositions.push(idx);
    }
  });

  // 콤보 분할: "+콘코울슬로" 포함 메뉴는 콘코울슬로 그룹에도 가상 행 추가
  // rawMenuName에 공백이 있는 경우("케이준 치킨텐더 5PCS + 콘코울슬로")도 매칭하기 위해
  // "+" 주변 공백을 제거한 비교용 문자열 사용.
  const comboRows = [];
  for (const row of classifiedRows) {
    const rawForCheck = typeof row.rawMenuName === 'string'
      ? row.rawMenuName.replace(/\s*\+\s*/g, '+')
      : '';
    if (row.status === 'classified' && rawForCheck.includes('+콘코울슬로')) {
      comboRows.push({
        ...row,
        mappedMenuName: '콘코울슬로',
        category: '사이드',
        groupName: '콘코울슬로',
        detailName: '콘코울슬로',
        isCombo: true, // 콤보 분할 가상 행 — 재분류 시 원본에서 제외하고 다시 생성
      });
    }
  }
  if (comboRows.length > 0) classifiedRows.push(...comboRows);

  return {
    classifiedRows,
    groupedIssues: Object.values(issueMap),
  };
}
