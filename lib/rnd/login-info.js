import { initDB, getAll, hasStore, put, deleteById } from '@/lib/db';

const STORE = 'rnd_login_credentials';

function text(value) {
  return String(value ?? '').trim();
}

function normalizeUrl(value) {
  const raw = text(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function buildCredential(data = {}, existing = {}) {
  const now = new Date().toISOString();
  const hasLegacyIsp = Boolean(data.isIsp ?? existing.isIsp);
  const ispMemo = text(data.ispMemo ?? existing.ispMemo) || (hasLegacyIsp ? 'ISP' : '');
  return {
    ...existing,
    siteName: text(data.siteName ?? existing.siteName),
    loginId: text(data.loginId ?? existing.loginId),
    password: String(data.password ?? existing.password ?? ''),
    siteUrl: normalizeUrl(data.siteUrl ?? existing.siteUrl),
    category: text(data.category ?? existing.category) || (ispMemo ? '법인카드 ISP' : '일반'),
    ispMemo,
    memo: text(data.memo ?? existing.memo),
    isIsp: Boolean(ispMemo || hasLegacyIsp),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

export async function getLoginCredentials() {
  await initDB();
  if (!hasStore(STORE)) return [];
  return (await getAll(STORE)).sort((a, b) =>
    String(a.siteName || '').localeCompare(String(b.siteName || ''), 'ko')
  );
}

export async function saveLoginCredential(data) {
  await initDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  return put(STORE, buildCredential(data));
}

export async function removeLoginCredential(id) {
  await initDB();
  if (!hasStore(STORE)) return;
  return deleteById(STORE, id);
}

export function credentialSiteHref(credential) {
  return normalizeUrl(credential?.siteUrl);
}
