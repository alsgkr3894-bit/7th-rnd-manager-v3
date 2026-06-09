'use client';
import { useState } from 'react';
import { MODULE_KEYS } from '@/lib/db';

const MODULE_KEY_SET = new Set(MODULE_KEYS);

export function isKnownModuleScope(key) {
  return MODULE_KEY_SET.has(key);
}

export function buildModuleScopeMap(value = true) {
  return Object.fromEntries(MODULE_KEYS.map(key => [key, Boolean(value)]));
}

/**
 * 백업/복원 페이지에서 공통으로 사용하는 모듈 선택 상태 훅.
 *
 * @param {boolean} [initialValue=true] - 초기 전체 선택 여부
 * @returns {{ scopes, toggleScope, setAllScopes }}
 */
export function useModuleScopes(initialValue = true) {
  const [scopes, setScopes] = useState(() => buildModuleScopeMap(initialValue));

  function toggleScope(key) {
    if (!isKnownModuleScope(key)) return;
    setScopes(s => ({ ...s, [key]: !s[key] }));
  }

  function setAllScopes(value) {
    setScopes(buildModuleScopeMap(value));
  }

  return { scopes, toggleScope, setAllScopes };
}
