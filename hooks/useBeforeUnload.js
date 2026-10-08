import { useEffect } from 'react';
import { registerUnsavedChanges } from '@/lib/ui/unsaved-changes';

const DEFAULT_MESSAGE = '저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';

export function normalizeBeforeUnloadMessage(message, fallback = DEFAULT_MESSAGE) {
  if (typeof message === 'string' || typeof message === 'number') return String(message);
  return fallback;
}

/**
 * 저장 안 한 변경이 있으면 탭 닫기·새로고침 때 브라우저 경고를 띄우고, 같은 상태를 공용 목록
 * (lib/ui/unsaved-changes.js)에 등록해 사이드바·링크·단축키 등 앱 안 이동도 확인을 받게 한다.
 * @param {boolean} isDirty - true면 페이지 이탈 시 경고
 */
export function useBeforeUnload(isDirty, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!isDirty) return;
    const safeMessage = normalizeBeforeUnloadMessage(message);
    const unregister = registerUnsavedChanges(safeMessage);
    const handle = e => {
      e.preventDefault();
      e.returnValue = safeMessage;
      return safeMessage;
    };
    window.addEventListener('beforeunload', handle);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', handle);
    };
  }, [isDirty, message]);
}
