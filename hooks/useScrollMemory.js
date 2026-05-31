import { useEffect, useRef } from 'react';
/** @param {string} key - sessionStorage 키 (스크롤 위치 저장) */
export function useScrollMemory(key) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    const saved = sessionStorage.getItem('scroll:' + key);
    if (saved) {
      const main = document.querySelector('#main-content');
      if (main) { main.scrollTop = parseInt(saved); }
    }
    restored.current = true;
  }, [key]);
  useEffect(() => {
    const main = document.querySelector('#main-content');
    if (!main) return;
    const handle = () => sessionStorage.setItem('scroll:' + key, main.scrollTop);
    main.addEventListener('scroll', handle, { passive: true });
    return () => main.removeEventListener('scroll', handle);
  }, [key]);
}
