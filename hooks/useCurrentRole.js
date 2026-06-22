'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { ACTIVE_ACCOUNT_KEY, getActiveRole, isActiveAccountStorageKey } from '@/lib/auth/accounts';

/**
 * 현재 활성 계정의 역할을 반환한다.
 * 계정이 없으면 'admin' 기본값, 권한 확인 실패 시에는 'viewer'로 닫는다.
 * localStorage ACTIVE_ACCOUNT_KEY 계열 변경 시 자동 갱신.
 * @returns {{ role: 'admin'|'viewer', isAdmin: boolean, isViewer: boolean, ready: boolean }}
 */
export function useCurrentRole() {
  const [role, setRole] = useState('viewer');
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);
  const refreshSeqRef = useRef(0);

  const refresh = useCallback(() => {
    const seq = ++refreshSeqRef.current;
    setReady(false);
    initDB()
      .then(() => getActiveRole())
      .then(r => {
        if (!mountedRef.current || seq !== refreshSeqRef.current) return;
        setRole(r);
        setReady(true);
      })
      .catch(() => {
        if (!mountedRef.current || seq !== refreshSeqRef.current) return;
        setRole('viewer');
        setReady(true);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    // storage: 다른 탭에서 전환 시 / rnd:account-changed: 같은 탭에서 전환 시
    function onStorage(e) {
      if (e.key === ACTIVE_ACCOUNT_KEY || isActiveAccountStorageKey(e.key)) refresh();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('rnd:account-changed', refresh);
    return () => {
      mountedRef.current = false;
      refreshSeqRef.current += 1;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rnd:account-changed', refresh);
    };
  }, [refresh]);

  return { role, isAdmin: role === 'admin', isViewer: role === 'viewer', ready };
}
