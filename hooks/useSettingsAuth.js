'use client';
import { useSyncExternalStore, useCallback } from 'react';

const LS_KEY = 'v3:settings-pin';
const SESSION_KEY = 'v3:settings-auth-session';

/**
 * 설정 PIN/인증 상태를 모든 훅 인스턴스가 공유하도록 외부 store로 관리한다.
 * (이전: 인스턴스마다 별도 useState → settings/layout 게이트와 account/page 설정자가
 *  서로 다른 상태를 가져 PIN 설정/해제가 게이트에 즉시 반영되지 않는 desync 버그)
 */
const listeners = new Set();
function emit() {
  listeners.forEach(l => l());
}

function onStorageEvent(e) {
  if (e.key === LS_KEY || e.key === null) emit();
}

// 다른 탭의 localStorage 변경도 반영. storage 리스너는 첫 구독자 시 등록,
// 마지막 구독자 해제 시 제거 — 모듈 레벨 사이드이펙트 없음.
function subscribe(l) {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorageEvent);
  }
  listeners.add(l);
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorageEvent);
    }
  };
}

function readPin() {
  try {
    return localStorage.getItem(LS_KEY) || '';
  } catch {
    return '';
  }
}
function readAuth() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * @returns {{ authenticated, hasPin, verify, setPin, lock }}
 */
export function useSettingsAuth() {
  // 원시값(string/boolean) 스냅샷 → Object.is 비교로 안정적, 무한 루프 없음.
  // getServerSnapshot으로 SSR 안전(서버: PIN 없음 → 게이트 통과).
  const storedPin = useSyncExternalStore(subscribe, readPin, () => '');
  const authenticated = useSyncExternalStore(subscribe, readAuth, () => true);

  const hasPin = storedPin.length > 0;

  const verify = useCallback(input => {
    if (input === readPin()) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
      emit();
      return true;
    }
    return false;
  }, []);

  const setPin = useCallback(newPin => {
    try {
      if (newPin) localStorage.setItem(LS_KEY, newPin);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    emit();
  }, []);

  const lock = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    emit();
  }, []);

  return { authenticated: !hasPin || authenticated, hasPin, verify, setPin, lock };
}
