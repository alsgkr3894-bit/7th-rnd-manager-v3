import { useState, useEffect } from 'react';

export function normalizeDelay(value, fallback = 200) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** @param {any} value @param {number} delay @returns {any} debounced value */
export function useDebounce(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), normalizeDelay(delay));
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
