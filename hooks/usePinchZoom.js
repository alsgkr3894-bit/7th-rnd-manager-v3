import { useRef, useState, useEffect } from 'react';

export function usePinchZoom() {
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const lastDistRef = useRef(null);
  const lastTapRef = useRef(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    function getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastDistRef.current = getDistance(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          scaleRef.current = 1;
          setScale(1);
          el.style.transform = 'scale(1)';
          e.preventDefault();
        }
        lastTapRef.current = now;
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const delta = dist / lastDistRef.current;
        lastDistRef.current = dist;
        const next = Math.min(4, Math.max(1, scaleRef.current * delta));
        scaleRef.current = next;
        setScale(next);
        el.style.transform = `scale(${next})`;
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) lastDistRef.current = null;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  function resetScale() {
    scaleRef.current = 1;
    setScale(1);
    if (imgRef.current) imgRef.current.style.transform = 'scale(1)';
  }

  return { imgRef, scale, resetScale };
}
