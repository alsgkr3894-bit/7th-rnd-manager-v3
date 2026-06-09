'use client';
import { useState, useEffect } from 'react';

export function normalizeCountUpNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeCountUpOptions(options = {}) {
  const {
    duration = 1200,
    delay = 0,
    decimals = 0,
  } = options && typeof options === 'object' ? options : {};

  return {
    duration: Math.max(1, normalizeCountUpNumber(duration, 1200)),
    delay: Math.max(0, normalizeCountUpNumber(delay, 0)),
    decimals: Math.max(0, Math.floor(normalizeCountUpNumber(decimals, 0))),
  };
}

export function useCountUp(target, options = {}) {
  const [val, setVal] = useState(0);
  const safeTarget = normalizeCountUpNumber(target, 0);
  const opts = normalizeCountUpOptions(options);

  useEffect(() => {
    let startTime = null,
      rafId;
    const run = () => {
      rafId = requestAnimationFrame(function tick(now) {
        if (!startTime) startTime = now;
        const t = Math.min((now - startTime) / opts.duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = eased * safeTarget;
        setVal(opts.decimals > 0 ? parseFloat(cur.toFixed(opts.decimals)) : Math.round(cur));
        if (t < 1) rafId = requestAnimationFrame(tick);
        else setVal(safeTarget);
      });
    };
    const timer = opts.delay > 0 ? setTimeout(run, opts.delay) : (run(), null);
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [safeTarget, opts.duration, opts.delay, opts.decimals]);
  return val;
}
