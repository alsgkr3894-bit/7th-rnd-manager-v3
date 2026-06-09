import { useEffect, useRef } from 'react';

export function isVisibleState(visibilityState) {
  return visibilityState === 'visible';
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
  useEffect(() => { ref.current = onVisible; });
  useEffect(() => {
    const handler = () => {
      if (isVisibleState(document.visibilityState)) {
        invokeVisibilityRefresh(ref.current);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}
