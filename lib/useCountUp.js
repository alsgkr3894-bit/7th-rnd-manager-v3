'use client';
import { useState, useEffect } from 'react';

export function useCountUp(target, { duration = 1200, delay = 0, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let startTime = null, rafId;
    const run = () => {
      rafId = requestAnimationFrame(function tick(now) {
        if (!startTime) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = eased * target;
        setVal(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.round(cur));
        if (t < 1) rafId = requestAnimationFrame(tick);
        else setVal(target);
      });
    };
    const timer = delay > 0 ? setTimeout(run, delay) : (run(), null);
    return () => { if (timer) clearTimeout(timer); cancelAnimationFrame(rafId); };
  }, [target]);
  return val;
}
