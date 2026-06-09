import { useEffect, useRef } from 'react';

export function normalizeScrollTop(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '') return null;
  const top = Number(raw);
  if (!Number.isFinite(top) || top < 0) return null;
  return Math.floor(top);
}

/** @param {string} key - sessionStorage 키 (스크롤 위치 저장) */
export function useScrollMemory(key) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    let saved = null;
    try {
      saved = sessionStorage.getItem('scroll:' + key);
    } catch {}
    const top = normalizeScrollTop(saved);
    if (top !== null) {
      const main = document.querySelector('#main-content');
      if (main) {
        main.scrollTop = top;
      }
    }
    restored.current = true;
  }, [key]);
  useEffect(() => {
    const main = document.querySelector('#main-content');
    if (!main) return;
    const handle = () => {
      try {
        sessionStorage.setItem('scroll:' + key, String(main.scrollTop));
      } catch {}
    };
    main.addEventListener('scroll', handle, { passive: true });
    return () => main.removeEventListener('scroll', handle);
  }, [key]);
}
