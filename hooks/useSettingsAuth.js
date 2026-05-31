import { useState, useCallback } from 'react';

const LS_KEY = 'v3:settings-pin';
const SESSION_KEY = 'v3:settings-auth-session';

/**
 * 설정 페이지 PIN 인증 상태를 관리하는 훅.
 * @returns {{
 *   authenticated: boolean,
 *   hasPin: boolean,
 *   verify: (input: string) => boolean,
 *   setPin: (newPin: string) => void,
 *   lock: () => void
 * }}
 */
export function useSettingsAuth() {
  const [authenticated, setAuthenticated] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return true; }
  });
  // pin을 React state로 관리 → setPin 호출 시 리렌더 보장
  const [storedPin, setStoredPin] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
  });

  const hasPin = storedPin.length > 0;

  const verify = useCallback((input) => {
    if (input === storedPin) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setAuthenticated(true);
      return true;
    }
    return false;
  }, [storedPin]);

  const setPin = useCallback((newPin) => {
    try {
      if (newPin) localStorage.setItem(LS_KEY, newPin);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    setStoredPin(newPin || '');
  }, []);

  const lock = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthenticated(false);
  }, []);

  return { authenticated: !hasPin || authenticated, hasPin, verify, setPin, lock };
}
