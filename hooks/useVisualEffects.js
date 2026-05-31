import { useEffect } from 'react';

const RIPPLE_CLEANUP_MS   = 500;  // must match .ripple-effect CSS animation duration
const TILT_PERSPECTIVE_PX = 600;
const TILT_ROTATE_Y_DEG   = 6;
const TILT_ROTATE_X_DEG   = 4;

const SELECTORS = {
  BTN:       '.btn',
  CARD_LIFT: '.card-lift',
};

/**
 * 버튼 ripple 효과와 카드 tilt 효과를 document.body에 위임하여 적용.
 * AppShell에서 마운트 1회 호출.
 */
export function useVisualEffects() {
  // Ripple: .btn 클릭 시 물결 효과
  useEffect(() => {
    function addRipple(e) {
      const btn = e.currentTarget;
      const circle = document.createElement('span');
      circle.className = 'ripple-effect';
      const rect = btn.getBoundingClientRect();
      const cx = e.clientX || (rect.left + rect.width / 2);
      const cy = e.clientY || (rect.top  + rect.height / 2);
      circle.style.left = (cx - rect.left) + 'px';
      circle.style.top  = (cy - rect.top)  + 'px';
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), RIPPLE_CLEANUP_MS);
    }

    function attachRipples() {
      document.querySelectorAll(SELECTORS.BTN).forEach(btn => {
        if (btn.dataset.fxBound) return;
        btn.addEventListener('click', addRipple);
        btn.dataset.fxBound = '1';
      });
    }

    attachRipples();
    const observer = new MutationObserver(attachRipples);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Tilt: .card-lift 마우스 이동 시 원근감 기울기
  useEffect(() => {
    function onMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5;
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(${TILT_PERSPECTIVE_PX}px) rotateY(${cx * TILT_ROTATE_Y_DEG}deg) rotateX(${-cy * TILT_ROTATE_X_DEG}deg) translateY(-3px)`;
    }
    function onLeave(e) {
      e.currentTarget.style.transform = '';
    }

    function attachTilt() {
      document.querySelectorAll(SELECTORS.CARD_LIFT).forEach(card => {
        if (card.dataset.fxBound) return;
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
        card.dataset.fxBound = '1';
      });
    }

    attachTilt();
    const observer = new MutationObserver(attachTilt);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
