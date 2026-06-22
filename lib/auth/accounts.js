/**
 * lib/auth/accounts.js — 로컬 계정 관리 (ref_accounts store)
 *
 * 역할: 'admin'(관리자) | 'viewer'(조회자)
 * 현재 활성 계정 ID는 브랜드별 localStorage key에 저장.
 * 기존 v3:auth 쿠키/middleware 로그인 게이트와 독립 공존.
 */
import { getAll, put, deleteById, hasStore } from '@/lib/db';
import {
  ACCOUNT_ROLES,
  ACTIVE_ACCOUNT_KEY,
  activeAccountKeyForBrand,
} from '@/lib/auth/account-constants';
import { getActiveBrandId } from '@/lib/active-brand';
import { assertActiveAdmin } from '@/lib/auth/guard';

export {
  ACCOUNT_ROLES,
  ROLE_LABELS,
  ACTIVE_ACCOUNT_KEY,
  ACTIVE_ACCOUNT_KEY_PREFIX,
  activeAccountKeyForBrand,
  isActiveAccountStorageKey,
} from '@/lib/auth/account-constants';

const STORE = 'ref_accounts';

function buildRecord(data) {
  return {
    name: (data.name || '').trim(),
    email: (data.email || '').trim(),
    role: ACCOUNT_ROLES.includes(data.role) ? data.role : 'viewer',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getAllAccounts(options = {}) {
  if (!hasStore(STORE)) return [];
  try {
    const rows = await getAll(STORE);
    return rows.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  } catch (err) {
    if (options.throwOnError) throw err;
    return [];
  }
}

export async function addAccount(data) {
  await assertActiveAdmin('계정 추가');
  if (!hasStore(STORE)) throw new Error('ref_accounts store 없음');
  const record = buildRecord(data);
  return put(STORE, record);
}

export async function updateAccount(data) {
  await assertActiveAdmin('계정 수정');
  if (!hasStore(STORE)) throw new Error('ref_accounts store 없음');
  if (!data.id) throw new Error('id가 필요합니다');
  const existing = (await getAll(STORE)).find(r => r.id === data.id);
  if (!existing) throw new Error('계정을 찾을 수 없습니다');
  return put(STORE, { ...existing, ...buildRecord({ ...existing, ...data }), id: data.id });
}

export async function deleteAccount(id) {
  await assertActiveAdmin('계정 삭제');
  if (!hasStore(STORE)) return;
  await deleteById(STORE, id);
}

export async function seedDefaultAdminIfEmpty() {
  if (!hasStore(STORE)) return;
  try {
    const all = await getAll(STORE);
    if (all.length > 0) return;
    await put(STORE, buildRecord({ name: '관리자', email: '', role: 'admin' }));
  } catch {
    // 초기화 실패는 무시
  }
}

function normalizeStoredAccountId(value) {
  if (value == null || value === '') return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function getStoredAccountId(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    return normalizeStoredAccountId(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function setStoredAccountId(key, id) {
  if (typeof localStorage === 'undefined') return false;
  try {
    if (id == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(id));
    return true;
  } catch {
    return false;
  }
}

export function getActiveAccountStorageKey(brandId = getActiveBrandId()) {
  return activeAccountKeyForBrand(brandId);
}

export function getActiveAccountId(brandId = getActiveBrandId()) {
  if (typeof window === 'undefined') return null;
  const key = getActiveAccountStorageKey(brandId);
  const scoped = getStoredAccountId(key);
  if (scoped != null) return scoped;
  if (key === activeAccountKeyForBrand('main')) {
    return getStoredAccountId(ACTIVE_ACCOUNT_KEY);
  }
  return null;
}

export function setActiveAccountId(id, brandId = getActiveBrandId()) {
  if (typeof window === 'undefined') return false;
  const key = getActiveAccountStorageKey(brandId);
  const scopedSaved = setStoredAccountId(key, id);
  let legacySaved = true;
  if (key === activeAccountKeyForBrand('main')) {
    legacySaved = setStoredAccountId(ACTIVE_ACCOUNT_KEY, id);
  }
  if (!scopedSaved || !legacySaved) return false;
  window.dispatchEvent?.(new CustomEvent('rnd:account-changed', { detail: { brandId, key } }));
  return true;
}

export async function getActiveRole() {
  try {
    const all = await getAllAccounts({ throwOnError: true });
    if (all.length === 0) return 'admin';
    const id = getActiveAccountId();
    const account = id != null ? all.find(a => a.id === id) : null;
    return account?.role ?? all[0]?.role ?? 'admin';
  } catch {
    return 'viewer';
  }
}
