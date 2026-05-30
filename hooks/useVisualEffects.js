import { useEffect } from 'react';

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
      setTimeout(() => circle.remove(), 500);
    }

    function attachRipples() {
      document.querySelectorAll('.btn').forEach(btn => {
        btn.removeEventListener('click', addRipple);
        btn.addEventListener('click', addRipple);
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
      card.style.transform = `perspective(600px) rotateY(${cx * 6}deg) rotateX(${-cy * 4}deg) translateY(-3px)`;
    }
    function onLeave(e) {
      e.currentTarget.style.transform = '';
    }

    function attachTilt() {
      document.querySelectorAll('.card-lift').forEach(card => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
      });
    }

    attachTilt();
    const observer = new MutationObserver(attachTilt);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
