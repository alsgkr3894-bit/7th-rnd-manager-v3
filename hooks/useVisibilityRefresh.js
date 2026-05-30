import { useEffect } from 'react';

/**
 * 브라우저 탭이 다시 포그라운드로 돌아올 때 콜백 실행
 * @param {Function} onVisible - 탭 활성화 시 호출할 함수
 */
export function useVisibilityRefresh(onVisible) {
  useEffect(() => {
    const handle = () => { if (!document.hidden) onVisible(); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [onVisible]);
}
