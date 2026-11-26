/**
 * lib/worker/run-in-worker.js — 한 번짜리 작업을 별도 스레드에서 실행한다.
 *
 * 작업 쪽이 보내는 메시지: { type: 'progress', value } · { type: 'chunk', ... } ·
 * { type: 'done', result } · { type: 'error', message }
 * 성공·실패·취소·시간 초과 어느 경우든 스레드를 끝내 메모리를 돌려준다.
 */
const STOPPED = '파일을 읽는 작업이 중단됐습니다. 파일이 너무 크거나 손상됐을 수 있습니다.';

function abortError() {
  const error = new Error('파일 읽기를 취소했습니다');
  error.name = 'AbortError';
  return error;
}

/**
 * @param {object} options
 * @param {() => Worker} options.createWorker
 * @param {unknown} options.message - 작업 쪽으로 보낼 값
 * @param {() => Promise<unknown>} options.fallback - 별도 스레드를 못 쓰는 환경에서 실행
 * @param {number} options.timeoutMs
 * @param {AbortSignal} [options.signal]
 * @param {(value: unknown) => void} [options.onProgress]
 * @param {(message: object) => void} [options.onChunk]
 */
export async function runInWorker({
  createWorker,
  message,
  fallback,
  timeoutMs,
  signal,
  onProgress,
  onChunk,
}) {
  if (signal?.aborted) throw abortError();
  if (typeof Worker !== 'function') return fallback();
  let worker;
  try {
    worker = createWorker();
  } catch (error) {
    console.warn('[worker] 별도 스레드를 만들지 못했습니다:', error?.message || String(error));
    return fallback();
  }
  return new Promise((resolve, reject) => {
    let timer = null;
    const onAbort = () => finish(reject, abortError());
    function finish(settle, value) {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      settle(value);
    }
    worker.onmessage = ({ data }) => {
      try {
        if (data?.type === 'progress') onProgress?.(data.value);
        else if (data?.type === 'chunk') onChunk?.(data);
        else if (data?.type === 'done') finish(resolve, data.result);
        else if (data?.type === 'error') finish(reject, new Error(data.message));
      } catch (error) {
        finish(reject, error);
      }
    };
    worker.onerror = event => {
      event?.preventDefault?.();
      finish(reject, new Error(STOPPED));
    };
    worker.onmessageerror = () => finish(reject, new Error(STOPPED));
    timer = setTimeout(
      () => finish(reject, new Error('파일을 읽는 시간이 초과됐습니다. 파일을 확인해 주세요.')),
      timeoutMs
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      worker.postMessage(message);
    } catch (error) {
      finish(reject, error);
    }
  });
}
