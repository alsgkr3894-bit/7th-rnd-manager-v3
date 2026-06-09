/**
 * lib/price/price-events.js — 단가 파일 변경 알림 허브
 *
 * 단가 파일이 업로드/삭제되면 원가 계산에 의존하는 모든 화면(레시피·전체요약·마진)이
 * 즉시 재조회해야 한다. 화면 전환 시 remount를 기다리지 않도록 이 허브를 통해 통지한다.
 */

const listeners = new Set();

/**
 * 단가 변경 구독. 반환된 함수를 호출하면 구독 해제.
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function onPriceUpload(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 단가 변경 통지 — 모든 구독자에게 전파 (개별 실패는 격리). */
export function emitPriceUpload() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.warn('[price-events] listener 오류:', err);
    }
  }
}
