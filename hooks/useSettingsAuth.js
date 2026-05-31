import { useState, useCallback } from 'react';

const LS_KEY = 'v3:settings-pin';
const SESSION_KEY = 'v3:settings-auth-session';

export function useSettingsAuth() {
  const [authenticated, setAuthenticated] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return true; }
  });

  const pin = (() => { try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; } })();
  const hasPin = pin.length > 0;

  const verify = useCallback((input) => {
    if (input === pin) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setAuthenticated(true);
      return true;
    }
    return false;
  }, [pin]);

  const setPin = useCallback((newPin) => {
    try {
      if (newPin) localStorage.setItem(LS_KEY, newPin);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  const lock = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthenticated(false);
  }, []);

  return { authenticated: !hasPin || authenticated, hasPin, verify, setPin, lock };
}
