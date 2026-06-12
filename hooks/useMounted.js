import { useEffect, useRef } from 'react';

/**
 * Returns a ref whose `.current` is true while the component is mounted.
 * Drop-in replacement for the repeated `mountedRef = useRef(true)` + cleanup pattern.
 */
export function useMounted() {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}
