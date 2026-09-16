/**
 * lib/sales/registered-override.js — "미등록" 자동 판정 개별 해제 조회 헬퍼.
 *
 * 판매량 보고서 순위표의 "미등록" 판정(lib/report/build-sales-report.js)은 판매 그룹명과
 * menu_master 이름을 정확 일치로만 비교한다(lib/menu-master/discontinued-lookup.js). 규격·
 * 수량 표기(4PCS, 355ml 등)나 판매 분류 그룹명이 실제 메뉴마스터명과 다르면, 등록된 메뉴인데도
 * "미등록"으로 잘못 판정될 수 있다. 사용자가 순위표 체크박스로 "이건 미등록이 아니다"를 표시하면
 * ref_registered_overrides store(lib/sales/store-user-rules.js)에 저장되고, 이후 순위표에서
 * "미등록" 배지·"+ 단종" 버튼이 사라진다(체크박스는 남아 다시 미등록으로 되돌릴 수 있다).
 *
 * ref_discontinued(비정규메뉴 단종 처리)와 반대 방향의 목록이지만 구조는 동일하다.
 */
import { normalizeMenuName } from '@/lib/sales/normalize';

/**
 * ref_registered_overrides 행들의 정규화된 메뉴명 집합을 만든다.
 * @param {Array<{menuName?: string}>} registeredOverrideRows
 * @returns {Set<string>}
 */
export function buildRegisteredOverrideNameSet(registeredOverrideRows) {
  const set = new Set();
  for (const row of Array.isArray(registeredOverrideRows) ? registeredOverrideRows : []) {
    const normalized = normalizeMenuName(row?.menuName);
    if (normalized) set.add(normalized);
  }
  return set;
}

/** 주어진 표시명이 "미등록 판정 해제" 집합에 있는지(정규화 후 비교). */
export function isRegisteredOverrideName(name, registeredOverrideNameSet) {
  if (!registeredOverrideNameSet || registeredOverrideNameSet.size === 0) return false;
  return registeredOverrideNameSet.has(normalizeMenuName(name));
}
