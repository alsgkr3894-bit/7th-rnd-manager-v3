import { useState, useEffect, useCallback, useRef } from 'react';
import { initDB } from '@/lib/db';

const RELOAD_WAIT_LIMIT_MS = 10000;

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

  // 조회 중에 온 다시 불러오기 요청은 모아서 끝난 뒤 한 번만 실행한다(연속 저장·단가 알림)
  const runningRef = useRef(null);
  const queuedRef = useRef(false);
  const reload = useCallback(() => {
    const running = runningRef.current;
    // 너무 오래 걸리는 조회는 기다리지 않고 새로 시작한다("다시 시도"가 먹히게)
    if (running && Date.now() - running.startedAt < RELOAD_WAIT_LIMIT_MS) queuedRef.current = true;
    else setTick(n => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const current = { startedAt: Date.now() };
    runningRef.current = current;
    queuedRef.current = false;

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
        if (!cancelled) {
          setLoading(false);
          if (runningRef.current === current) {
            runningRef.current = null;
            if (queuedRef.current) {
              queuedRef.current = false;
              setTick(n => n + 1);
            }
          }
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      if (runningRef.current === current) runningRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, enabled, ...deps]);

  const errorMessage = error ? (mapErrorMessage ? mapErrorMessage(error) : error.message) : null;

  return { data, loading, error, errorMessage, reload };
}
