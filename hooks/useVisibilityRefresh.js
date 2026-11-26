import { useEffect, useRef } from 'react';

export const MIN_REFRESH_INTERVAL_MS = 1500;

export function isVisibleState(visibilityState) {
  return visibilityState === 'visible';
}

/** 마지막 새로고침 뒤 충분히 지났는가 — 탭 전환 때 이벤트가 연달아 와도 한 번만 읽게 한다. */
export function isRefreshDue(lastAt, now, minIntervalMs = MIN_REFRESH_INTERVAL_MS) {
  return !(Number.isFinite(lastAt) && now - lastAt < minIntervalMs);
}

function warnVisibilityRefreshError(error) {
  console.warn('[useVisibilityRefresh] refresh 실패', error);
}

export function invokeVisibilityRefresh(callback, onError = warnVisibilityRefreshError) {
  if (typeof callback !== 'function') return false;

  try {
    const result = callback();
    if (result && typeof result.then === 'function') {
      Promise.resolve(result).catch(onError);
    }
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

/**
 * 브라우저 탭이 다시 포그라운드로 돌아올 때 콜백 실행
 * @param {Function} onVisible - 탭 활성화 시 호출할 함수
 */
export function useVisibilityRefresh(onVisible) {
  const ref = useRef(onVisible);
  useEffect(() => {
    ref.current = onVisible;
  });
  const lastAtRef = useRef(null);
  useEffect(() => {
    const handler = () => {
      if (!isVisibleState(document.visibilityState)) return;
      const now = Date.now();
      if (!isRefreshDue(lastAtRef.current, now)) return;
      lastAtRef.current = now;
      invokeVisibilityRefresh(ref.current);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}
