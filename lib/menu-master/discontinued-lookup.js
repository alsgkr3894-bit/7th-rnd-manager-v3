/**
 * lib/menu-master/discontinued-lookup.js — 메뉴마스터 "단종" 상태를 이름으로 조회하기 위한 헬퍼.
 *
 * 판매량/보고서 화면은 menu_master와 직접 FK로 연결돼 있지 않고, 업로드된 판매명
 * 문자열로만 메뉴를 식별한다. 여기서는 정확한 매칭만 인정한다 — 잘못 매칭해
 * "단종 아닌데 단종으로 표시"되는 false positive가, 매칭 실패로 배지가 안 뜨는
 * false negative보다 훨씬 나쁘다.
 */
import { normalizeMenuName } from '@/lib/sales/normalize';

/**
 * 단종 처리된 menu_master 행들의 정규화된 메뉴명 집합을 만든다.
 * @param {Array<{menuName?: string, status?: string}>} menuMasterRows
 * @returns {Set<string>}
 */
export function buildDiscontinuedMenuNameSet(menuMasterRows) {
  const set = new Set();
  for (const row of Array.isArray(menuMasterRows) ? menuMasterRows : []) {
    if (row?.status !== 'discontinued') continue;
    const name = normalizeMenuName(row?.menuName);
    if (name) set.add(name);
  }
  return set;
}

/** 주어진 표시명이 단종 집합에 있는지(정규화 후 비교). */
export function isDiscontinuedMenuName(name, discontinuedNameSet) {
  if (!discontinuedNameSet || discontinuedNameSet.size === 0) return false;
  return discontinuedNameSet.has(normalizeMenuName(name));
}
