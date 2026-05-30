import { useEffect } from 'react';

export function useBeforeUnload(isDirty, message = '저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?') {
  useEffect(() => {
    if (!isDirty) return;
    const handle = (e) => { e.preventDefault(); e.returnValue = message; return message; };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty, message]);
}
