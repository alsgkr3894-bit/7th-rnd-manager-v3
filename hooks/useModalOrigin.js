'use client';
import { useLayoutEffect } from 'react';
import { getRecentClickPoint } from '@/lib/ui/click-origin';

/**
 * 모달 카드(.modal-anim)가 최근 클릭 지점에서 펼쳐지도록 transform-origin을 설정.
 *
 * modal-in 키프레임이 scale(0.94)→none 이므로 transform-origin을 클릭 좌표로
 * 잡으면 "누른 곳에서 펼쳐지는" 효과가 난다. 클릭이 카드 밖이면 가장 가까운
 * 모서리로 clamp 되어 클릭 방향에서 펼쳐진다. 최근 클릭이 없으면(키보드 등)
 * 아무것도 하지 않아 기본 중앙 origin이 유지된다.
 *
 * useLayoutEffect로 첫 페인트 전에 설정해 깜빡임(중앙→클릭)을 방지한다.
 *
 * @param {import('react').RefObject<HTMLElement>} ref - .modal-anim 카드 ref
 */
export function useModalOrigin(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pt = getRecentClickPoint();
    if (!pt) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ox = Math.max(0, Math.min(r.width, pt.x - r.left));
    const oy = Math.max(0, Math.min(r.height, pt.y - r.top));
    el.style.transformOrigin = `${ox}px ${oy}px`;
  }, [ref]);
}
