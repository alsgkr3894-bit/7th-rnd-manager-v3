'use client';
import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { getActiveRole } from '@/lib/auth/accounts';

/**
 * 현재 활성 계정의 역할을 반환한다.
 * 계정이 없으면 'admin' 기본값.
 * @returns {{ role: 'admin'|'viewer', isAdmin: boolean, isViewer: boolean }}
 */
export function useCurrentRole() {
  const [role, setRole] = useState('admin');

  useEffect(() => {
    initDB()
      .then(() => getActiveRole())
      .then(r => setRole(r))
      .catch(() => setRole('admin'));
  }, []);

  return { role, isAdmin: role === 'admin', isViewer: role === 'viewer' };
}
