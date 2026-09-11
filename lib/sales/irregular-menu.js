/**
 * lib/sales/irregular-menu.js — "비정규메뉴"(menu_master에 없는 판매명) 단종 처리 조회 헬퍼.
 *
 * 판매량 보고서 순위표에 menu_master에 등록되지 않은 판매명이 그대로 나타나는 경우가
 * 있다(예: 프로모션용 임시 상품명, 폐기된 옛 이름 등). 사용자가 순위표에서 직접 이런
 * 이름을 골라 "단종 처리"하면 ref_discontinued store(lib/sales/store-user-rules.js)에
 * 저장되고, 이후 순위표에서 "비정규메뉴" 배지로 표시되며 상승·하락·베스트·워스트
 * 집계에서 discontinued와 동일하게 제외된다(lib/report/build-sales-report.js).
 *
 * ref_discontinued는 menu_master를 건드리지 않는 별도의 가벼운 목록이다 — menu_master는
 * menuCode가 필수·유일해서 판매명만으로는 항목을 만들 수 없고, 원가·영양 등 다른 화면이
 * menu_master를 가격/레시피가 있는 실체로 가정하기 때문에 그 스키마를 침범하지 않는다.
 */
import { normalizeMenuName } from '@/lib/sales/normalize';

/**
 * ref_discontinued 행들의 정규화된 메뉴명 집합을 만든다.
 * @param {Array<{menuName?: string}>} refDiscontinuedRows
 * @returns {Set<string>}
 */
export function buildIrregularMenuNameSet(refDiscontinuedRows) {
  const set = new Set();
  for (const row of Array.isArray(refDiscontinuedRows) ? refDiscontinuedRows : []) {
    const normalized = normalizeMenuName(row?.menuName);
    if (normalized) set.add(normalized);
  }
  return set;
}

/** 주어진 표시명이 비정규메뉴 집합에 있는지(정규화 후 비교). */
export function isIrregularMenuName(name, irregularNameSet) {
  if (!irregularNameSet || irregularNameSet.size === 0) return false;
  return irregularNameSet.has(normalizeMenuName(name));
}
