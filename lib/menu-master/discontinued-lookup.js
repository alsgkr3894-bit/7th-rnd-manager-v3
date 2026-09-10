/**
 * lib/menu-master/discontinued-lookup.js — 메뉴마스터 "단종" 상태를 이름으로 조회하기 위한 헬퍼.
 *
 * 판매량/보고서 화면은 menu_master와 직접 FK로 연결돼 있지 않고, 업로드된 판매명
 * 문자열로만 메뉴를 식별한다. 여기서는 정확한 매칭만 인정한다 — 잘못 매칭해
 * "단종 아닌데 단종으로 표시"되는 false positive가, 매칭 실패로 배지가 안 뜨는
 * false negative보다 훨씬 나쁘다.
 *
 * 피자류는 판매량 화면에 menu_master 원본명("고구마 피자")이 아니라 판매 분류
 * 규칙표에서 수기로 정한 축약 그룹명("고구마")으로 표시된다 — 이 축약은 정규식으로
 * 일괄 유추할 수 없는 불규칙한 수작업 매핑이라(예외가 많음), 별도 스트립 로직을
 * 새로 만드는 대신 판매 데이터가 실제로 쓰는 것과 동일한 분류 파이프라인
 * (normalizeMenuName → mapAlias → matchRule)을 그대로 재사용해 그룹명을 구해
 * 집합에 함께 넣는다. 규칙표에 없으면(비피자 등) 원본명만 들어간다.
 */
import { normalizeMenuName } from '@/lib/sales/normalize';
import { mapAlias } from '@/lib/sales/alias';
import { matchRule } from '@/lib/sales/rule-matcher';
import { classifyMenuStatus, STATUS_ENUM } from '@/lib/sales/status';

/**
 * 단종 처리된 menu_master 행들의 정규화된 메뉴명 집합을 만든다.
 * 판매 분류 규칙표에 매칭되는 메뉴는 그 규칙의 groupName도 함께 포함한다.
 * @param {Array<{menuName?: string, status?: string}>} menuMasterRows
 * @returns {Set<string>}
 */
export function buildDiscontinuedMenuNameSet(menuMasterRows) {
  const set = new Set();
  for (const row of Array.isArray(menuMasterRows) ? menuMasterRows : []) {
    if (row?.status !== 'discontinued') continue;
    const normalized = normalizeMenuName(row?.menuName);
    if (!normalized) continue;
    set.add(normalized);

    const mappedMenuName = mapAlias(normalized);
    const matchedRule = matchRule(mappedMenuName);
    const result = classifyMenuStatus({ matchedRule });
    if (result.status === STATUS_ENUM.CLASSIFIED && result.groupName) {
      const groupName = normalizeMenuName(result.groupName);
      if (groupName) set.add(groupName);
    }
  }
  return set;
}

/** 주어진 표시명이 단종 집합에 있는지(정규화 후 비교). */
export function isDiscontinuedMenuName(name, discontinuedNameSet) {
  if (!discontinuedNameSet || discontinuedNameSet.size === 0) return false;
  return discontinuedNameSet.has(normalizeMenuName(name));
}
