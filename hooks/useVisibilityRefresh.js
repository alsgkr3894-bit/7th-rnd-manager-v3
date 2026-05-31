import { useEffect, useRef } from 'react';

/**
 * 브라우저 탭이 다시 포그라운드로 돌아올 때 콜백 실행
 * @param {Function} onVisible - 탭 활성화 시 호출할 함수
 */
export function useVisibilityRefresh(onVisible) {
  const ref = useRef(onVisible);
  useEffect(() => { ref.current = onVisible; });
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') ref.current?.(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}
