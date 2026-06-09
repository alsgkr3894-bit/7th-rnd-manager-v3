import { useEffect } from 'react';

const DEFAULT_MESSAGE = '저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';

export function normalizeBeforeUnloadMessage(message, fallback = DEFAULT_MESSAGE) {
  if (typeof message === 'string' || typeof message === 'number') return String(message);
  return fallback;
}

/** @param {boolean} isDirty - true면 페이지 이탈 시 경고 */
export function useBeforeUnload(isDirty, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!isDirty) return;
    const safeMessage = normalizeBeforeUnloadMessage(message);
    const handle = (e) => { e.preventDefault(); e.returnValue = safeMessage; return safeMessage; };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty, message]);
}
