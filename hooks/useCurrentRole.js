'use client';
import { useCallback, useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { ACTIVE_ACCOUNT_KEY, getActiveRole } from '@/lib/auth/accounts';

/**
 * 현재 활성 계정의 역할을 반환한다.
 * 계정이 없으면 'admin' 기본값.
 * localStorage ACTIVE_ACCOUNT_KEY 변경 시 자동 갱신.
 * @returns {{ role: 'admin'|'viewer', isAdmin: boolean, isViewer: boolean }}
 */
export function useCurrentRole() {
  const [role, setRole] = useState('admin');

  const refresh = useCallback(() => {
    initDB()
      .then(() => getActiveRole())
      .then(r => setRole(r))
      .catch(() => setRole('admin'));
  }, []);

  useEffect(() => {
    refresh();
    // storage: 다른 탭에서 전환 시 / rnd:account-changed: 같은 탭에서 전환 시
    function onStorage(e) {
      if (e.key === ACTIVE_ACCOUNT_KEY) refresh();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('rnd:account-changed', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rnd:account-changed', refresh);
    };
  }, [refresh]);

  return { role, isAdmin: role === 'admin', isViewer: role === 'viewer' };
}
