import { useEffect } from 'react';

const RIPPLE_CLEANUP_MS = 500; // must match .ripple-effect CSS animation duration
const TILT_PERSPECTIVE_PX = 600;
const TILT_ROTATE_Y_DEG = 6;
const TILT_ROTATE_X_DEG = 4;

const SELECTORS = {
  BTN: '.btn',
  CARD_LIFT: '.card-lift',
};

export function closestElement(target, selector) {
  if (!target || !selector) return null;
  if (typeof target.closest === 'function') return target.closest(selector);
  const parent = target.parentElement;
  return typeof parent?.closest === 'function' ? parent.closest(selector) : null;
}

export function getTiltTransform(clientX, clientY, rect) {
  const width = Number(rect?.width);
  const height = Number(rect?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return '';

  const cx = (Number(clientX) - Number(rect.left || 0)) / width - 0.5;
  const cy = (Number(clientY) - Number(rect.top || 0)) / height - 0.5;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return '';

  return `perspective(${TILT_PERSPECTIVE_PX}px) rotateY(${cx * TILT_ROTATE_Y_DEG}deg) rotateX(${-cy * TILT_ROTATE_X_DEG}deg) translateY(-3px)`;
}

/**
 * 버튼 ripple 효과와 카드 tilt 효과를 document.body에 위임하여 적용.
 * AppShell에서 마운트 1회 호출.
 *
 * 이벤트 위임만 사용하고 DOM 노드에 표식(data-fx-bound 등)을 남기지 않습니다.
 * 노드 속성을 변경하면 아직 hydration 되지 않은 Suspense 영역에서
 * "Extra attributes from the server" 경고를 유발하기 때문입니다.
 */
export function useVisualEffects() {
  // Ripple: .btn 클릭 시 물결 효과
  useEffect(() => {
    const timers = new Set();

    function addRipple(e) {
      const btn = closestElement(e.target, SELECTORS.BTN);
      if (!btn) return;
      const circle = document.createElement('span');
      circle.className = 'ripple-effect';
      const rect = btn.getBoundingClientRect();
      const cx = e.clientX || rect.left + rect.width / 2;
      const cy = e.clientY || rect.top + rect.height / 2;
      circle.style.left = cx - rect.left + 'px';
      circle.style.top = cy - rect.top + 'px';
      btn.appendChild(circle);
      const timer = setTimeout(() => {
        circle.remove();
        timers.delete(timer);
      }, RIPPLE_CLEANUP_MS);
      timers.add(timer);
    }

    document.body.addEventListener('click', addRipple);
    return () => {
      document.body.removeEventListener('click', addRipple);
      timers.forEach(timer => clearTimeout(timer));
      document.querySelectorAll('.ripple-effect').forEach(el => el.remove());
    };
  }, []);

  // Tilt: .card-lift 마우스 이동 시 원근감 기울기
  useEffect(() => {
    let active = null;

    function reset() {
      if (active) {
        active.style.transform = '';
        active = null;
      }
    }

    function onMove(e) {
      const card = closestElement(e.target, SELECTORS.CARD_LIFT);
      if (card !== active) reset();
      if (!card) return;
      active = card;
      const rect = card.getBoundingClientRect();
      const transform = getTiltTransform(e.clientX, e.clientY, rect);
      if (transform) card.style.transform = transform;
    }

    document.body.addEventListener('mousemove', onMove);
    document.body.addEventListener('mouseleave', reset);
    return () => {
      document.body.removeEventListener('mousemove', onMove);
      document.body.removeEventListener('mouseleave', reset);
    };
  }, []);
}
