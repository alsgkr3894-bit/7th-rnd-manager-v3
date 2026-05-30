import { useCallback, useEffect, useRef } from 'react';

/**
 * useTimeout — set/clear a self-cleaning timer.
 * Returns { set, clear }.
 *
 * set(fn, delay)  — schedules fn after delay ms; cancels any pending timer first.
 * clear()         — cancels the pending timer without calling fn.
 *
 * The pending timer is automatically cleared on unmount.
 */
export function useTimeout() {
  const idRef = useRef(null);

  const clear = useCallback(() => {
    if (idRef.current !== null) {
      clearTimeout(idRef.current);
      idRef.current = null;
    }
  }, []);

  const set = useCallback((fn, delay) => {
    clear();
    idRef.current = setTimeout(() => {
      idRef.current = null;
      fn();
    }, delay);
  }, [clear]);

  // cleanup on unmount
  useEffect(() => clear, [clear]);

  return { set, clear };
}
