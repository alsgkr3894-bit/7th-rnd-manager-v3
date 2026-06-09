/**
 * lib/shipment/products-events.js — 대상 제품(ref_shipment_products) 변경 알림 허브
 *
 * 전용/범용/범용관리·관리품목 분류는 ref_shipment_products 한 곳을 마스터로 둔다.
 * 다만 각 화면(대상 제품 관리·출고량 집계·가격비교)은 마운트 시점에 목록을 메모리에
 * 캐시하므로, 한 화면에서 분류를 바꿔도 다른 화면은 자동으로 갱신되지 않았다.
 *
 * 이 허브는 CRUD가 일어나면 구독 중인 모든 화면에 "다시 읽어라"를 통지해
 * 어디서 바꾸든 전체가 같은 마스터 값을 즉시 반영하도록 한다.
 */

const listeners = new Set();

/**
 * 변경 구독. 반환된 함수를 호출하면 구독 해제.
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function onManagedProductsChange(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 대상 제품 변경 통지 — 모든 구독자에게 전파 (개별 실패는 격리). */
export function emitManagedProductsChange() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.warn('[managed-products] listener 오류:', err);
    }
  }
}
