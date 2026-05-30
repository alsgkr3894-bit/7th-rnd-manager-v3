'use client';
import { useState } from 'react';
import { MODULE_KEYS } from '@/lib/db';

/**
 * 백업/복원 페이지에서 공통으로 사용하는 모듈 선택 상태 훅.
 *
 * @param {boolean} [initialValue=true] - 초기 전체 선택 여부
 * @returns {{ scopes, toggleScope, setAllScopes }}
 */
export function useModuleScopes(initialValue = true) {
  const [scopes, setScopes] = useState(() =>
    Object.fromEntries(MODULE_KEYS.map(k => [k, initialValue]))
  );

  function toggleScope(key) {
    setScopes(s => ({ ...s, [key]: !s[key] }));
  }

  function setAllScopes(value) {
    setScopes(Object.fromEntries(MODULE_KEYS.map(k => [k, value])));
  }

  return { scopes, toggleScope, setAllScopes };
}
