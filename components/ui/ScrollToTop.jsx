'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';

/**
 * ScrollToTop — 전역 "상단으로" 버튼. AppShell에 1회 마운트.
 * window를 일정 이상 스크롤하면 우하단에 나타나고, 클릭 시 최상단으로 부드럽게 이동.
 */
export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="scroll-top-btn"
      aria-label="상단으로 이동"
      title="상단으로"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <Icon.arrowUp style={{ width: 18, height: 18 }} />
    </button>
  );
}
