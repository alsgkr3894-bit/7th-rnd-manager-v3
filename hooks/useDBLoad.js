import { useState, useEffect, useCallback } from 'react';
import { initDB } from '@/lib/db';

/**
 * useDBLoad — initialise IndexedDB then run fetchFn.
 *
 * @param {() => Promise<any>} fetchFn  async function that reads from the DB.
 * @returns {{ data: any, loading: boolean, error: Error|null, reload: () => void }}
 *
 * - data    : resolved value of fetchFn (null until resolved)
 * - loading : true while initDB + fetchFn are running
 * - error   : any thrown Error, null on success
 * - reload  : call to re-run initDB + fetchFn manually
 */
export function useDBLoad(fetchFn) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);

  const reload = useCallback(() => setTick(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        await initDB();
        const result = await fetchFn();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { data, loading, error, reload };
}
