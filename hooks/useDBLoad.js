import { useState, useEffect, useCallback } from 'react';
import { initDB } from '@/lib/db';

/**
 * useDBLoad — initialise IndexedDB then run fetchFn.
 *
 * @param {() => Promise<any>} fetchFn  async function that reads from the DB.
 * @param {{
 *   initialData?: any,
 *   deps?: any[],
 *   enabled?: boolean,
 *   onError?: (err: Error) => void,
 *   mapErrorMessage?: (err: Error) => string,
 *   keepDataOnReload?: boolean,
 * }} [options]
 * @returns {{ data: any, loading: boolean, error: Error|null, errorMessage: string|null, reload: () => void }}
 *
 * options:
 *   initialData      — initial data before first load (default: null)
 *   deps             — extra deps that trigger re-run (e.g. filter params)
 *   enabled          — skip load if false (default: true)
 *   onError          — called with the Error when fetch fails
 *   mapErrorMessage  — convert Error to user-visible string; defaults to error.message
 *   keepDataOnReload — keep current data visible during reload instead of resetting (default: true)
 */
export function useDBLoad(fetchFn, options = {}) {
  const {
    initialData = null,
    deps = [],
    enabled = true,
    onError,
    mapErrorMessage,
    keepDataOnReload = true,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(n => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      if (!keepDataOnReload) setData(initialData);
      try {
        await initDB();
        const result = await fetchFn();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          if (onError) onError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, enabled, ...deps]);

  const errorMessage = error ? (mapErrorMessage ? mapErrorMessage(error) : error.message) : null;

  return { data, loading, error, errorMessage, reload };
}
