import { useRef, useState, useEffect } from 'react';

export function getTouchDistance(touches) {
  if (!touches || touches.length < 2) return null;
  const a = touches[0];
  const b = touches[1];
  if (!a || !b) return null;
  const dx = Number(a.clientX) - Number(b.clientX);
  const dy = Number(a.clientY) - Number(b.clientY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Number.isFinite(dist) && dist > 0 ? dist : null;
}

export function normalizePinchScale(currentScale, distance, lastDistance) {
  const current = Number(currentScale);
  const dist = Number(distance);
  const prev = Number(lastDistance);
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(dist) ||
    !Number.isFinite(prev) ||
    dist <= 0 ||
    prev <= 0
  ) {
    return 1;
  }
  return Math.min(4, Math.max(1, current * (dist / prev)));
}

export function usePinchZoom() {
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const lastDistRef = useRef(null);
  const lastTapRef = useRef(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastDistRef.current = getTouchDistance(e.touches);
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
        const dist = getTouchDistance(e.touches);
        if (dist === null) return;
        const next = normalizePinchScale(scaleRef.current, dist, lastDistRef.current);
        lastDistRef.current = dist;
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
