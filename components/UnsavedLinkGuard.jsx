'use client';
import { useEffect } from 'react';
import {
  confirmUnsavedLeave,
  hasUnsavedChanges,
  isLeavingLinkClick,
} from '@/lib/ui/unsaved-changes';

/**
 * 저장 안 한 변경이 있을 때 다른 화면으로 가는 링크 클릭에 확인을 받는다.
 * 앱 전체의 <a>·next/link를 한 번에 다룬다(문서 캡처 단계라 React/Next의 클릭 처리보다 먼저 실행).
 * 어떤 클릭이 "떠나는" 클릭인지는 isLeavingLinkClick(lib/ui/unsaved-changes.js)이 정한다.
 */
export function UnsavedLinkGuard() {
  useEffect(() => {
    function onClick(event) {
      if (!hasUnsavedChanges()) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      const leaving = isLeavingLinkClick(
        event,
        {
          target: anchor.target,
          hasDownload: anchor.hasAttribute('download'),
          origin: anchor.origin,
          pathname: anchor.pathname,
        },
        { origin: window.location.origin, pathname: window.location.pathname }
      );
      if (leaving && !confirmUnsavedLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
