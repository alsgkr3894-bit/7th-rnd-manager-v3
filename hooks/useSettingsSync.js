'use client';
import { useEffect } from 'react';
import { pushSettingsToServer } from '@/lib/settings-sync/client';

const FIRST_DELAY_MS = 8000;
const INTERVAL_MS = 60 * 1000;

/** 바뀐 화면 설정을 서버에 보관한다 — 앱을 연 뒤, 1분마다, 창을 벗어날 때 */
export function useSettingsSync() {
  useEffect(() => {
    const push = () => {
      pushSettingsToServer().catch(error => {
        console.warn('[settings-sync] 설정 보관 실패:', error?.message);
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') push();
    };
    const first = setTimeout(push, FIRST_DELAY_MS);
    const timer = setInterval(push, INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
