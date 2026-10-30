'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  floatingListPlacement,
  isSameFloatingPlacement,
} from '@/components/menu-master/recipe/floatingListPlacement';

/**
 * 입력칸 아래(자리가 모자라면 위)에 뜨는 자동완성 목록.
 *
 * 레시피 구성품 표·레시피 영역·수정 창은 모두 overflow가 걸려 있어, 목록을 표 안에 absolute로 두면
 * 마지막 줄이나 구성품이 적을 때 목록이 잘려 보이지 않았다(입력해도 자동완성이 안 나오는 것처럼 보임).
 * body로 포털해 화면 기준(fixed)으로 띄우면 어떤 상위 영역에도 잘리지 않는다.
 *
 * @param {{ getAnchor: () => HTMLElement|null, maxHeight?: number, children: any }} props
 */
export function FloatingSuggestionList({ getAnchor, maxHeight = 240, children }) {
  const [placement, setPlacement] = useState(null);

  const measure = useCallback(() => {
    const anchor = getAnchor?.();
    if (!anchor?.getBoundingClientRect) return;
    const next = floatingListPlacement(
      anchor.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
      { maxHeight }
    );
    setPlacement(prev => (isSameFloatingPlacement(prev, next) ? prev : next));
  }, [getAnchor, maxHeight]);

  // 목록 내용·입력칸 위치가 바뀔 수 있으니 렌더마다 다시 잰다(값이 같으면 상태를 바꾸지 않는다)
  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    window.addEventListener('resize', measure);
    // 수정 창·표 안쪽 스크롤도 잡도록 capture
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  if (!placement || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="listbox"
      style={{
        position: 'fixed',
        zIndex: 700,
        left: placement.left,
        width: placement.width,
        ...(placement.openUp ? { bottom: placement.bottom } : { top: placement.top }),
        maxHeight: placement.maxHeight,
        overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
