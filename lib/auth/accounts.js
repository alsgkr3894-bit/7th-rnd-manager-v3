/**
 * lib/auth/accounts.js — 로컬 계정 관리 (ref_accounts store)
 *
 * 역할: 'admin'(관리자) | 'viewer'(조회자)
 * 현재 활성 계정 ID는 localStorage에 ACTIVE_ACCOUNT_KEY로 저장.
 * 기존 v3:auth 쿠키/middleware 로그인 게이트와 독립 공존.
 */
import { getAll, put, deleteById, hasStore } from '@/lib/db';
import { ACCOUNT_ROLES, ACTIVE_ACCOUNT_KEY } from '@/lib/auth/account-constants';

export { ACCOUNT_ROLES, ROLE_LABELS, ACTIVE_ACCOUNT_KEY } from '@/lib/auth/account-constants';

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

export async function getAllAccounts() {
  if (!hasStore(STORE)) return [];
  try {
    const rows = await getAll(STORE);
    return rows.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function addAccount(data) {
  if (!hasStore(STORE)) throw new Error('ref_accounts store 없음');
  const record = buildRecord(data);
  return put(STORE, record);
}

export async function updateAccount(data) {
  if (!hasStore(STORE)) throw new Error('ref_accounts store 없음');
  if (!data.id) throw new Error('id가 필요합니다');
  const existing = (await getAll(STORE)).find(r => r.id === data.id);
  if (!existing) throw new Error('계정을 찾을 수 없습니다');
  return put(STORE, { ...existing, ...buildRecord({ ...existing, ...data }), id: data.id });
}

export async function deleteAccount(id) {
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

export function getActiveAccountId() {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  return v ? Number(v) : null;
}

export function setActiveAccountId(id) {
  if (typeof window === 'undefined') return;
  if (id == null) localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  else localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(id));
  window.dispatchEvent(new CustomEvent('rnd:account-changed'));
}

export async function getActiveRole() {
  try {
    const all = await getAllAccounts();
    if (all.length === 0) return 'admin';
    const id = getActiveAccountId();
    const account = id != null ? all.find(a => a.id === id) : null;
    return account?.role ?? all[0]?.role ?? 'admin';
  } catch {
    return 'admin';
  }
}
