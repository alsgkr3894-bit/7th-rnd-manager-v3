import { useEffect, useRef } from 'react';
import { isVisibleState } from '@/hooks/useVisibilityRefresh';

const DEFAULT_MIN_INTERVAL_MS = 1500;

/** 마지막 새로고침 뒤 충분히 지났는가 — 탭 전환 때 이벤트가 연달아 와도 한 번만 읽게 한다. */
export function isRefreshDue(lastAt, now, minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
  return !(Number.isFinite(lastAt) && now - lastAt < minIntervalMs);
}

/**
 * 사용자가 이 화면으로 "돌아올 때" 데이터를 다시 읽게 한다.
 *   - 브라우저 탭이 다시 앞으로 올 때(visibilitychange)
 *   - 창이 다시 활성화될 때(focus — 창끼리 전환하면 visibilitychange가 안 뜬다)
 *   - 뒤로/앞으로 가기로 캐시에서 복원될 때(pageshow persisted)
 * 계산 화면에서 값을 입력하고 열어 둔 출력 화면으로 돌아오면 예전 값이 그대로 보이던 문제용.
 * 화면 상태(탭·모달·정렬 등)는 건드리지 않고 onReturn이 데이터만 다시 읽게 한다.
 */
export function useRefreshOnReturn(onReturn, minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
  const callbackRef = useRef(onReturn);
  const lastAtRef = useRef(0);
  useEffect(() => {
    callbackRef.current = onReturn;
  });
  useEffect(() => {
    function run() {
      const now = Date.now();
      if (!isRefreshDue(lastAtRef.current, now, minIntervalMs)) return;
      lastAtRef.current = now;
      callbackRef.current?.();
    }
    function onVisibility() {
      if (isVisibleState(document.visibilityState)) run();
    }
    function onPageShow(event) {
      if (event.persisted) run();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', run);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', run);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [minIntervalMs]);
}
