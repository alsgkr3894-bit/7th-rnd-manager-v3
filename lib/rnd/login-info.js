import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedGetById as getById,
  sharedHasStore as hasStore,
  sharedPut as put,
  sharedDeleteById as deleteById,
} from '@/lib/db/shared';
import { assertActiveAdmin } from '@/lib/auth/guard';

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
  const record = {
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
  // 기존 레코드 수정 시 id를 보존해야 새 항목이 중복 생성되지 않는다.
  const id = data.id ?? existing.id;
  if (id != null) return { ...record, id };
  return record;
}

export async function getLoginCredentials() {
  await initSharedDB();
  if (!hasStore(STORE)) return [];
  return (await getAll(STORE)).sort((a, b) =>
    String(a.siteName || '').localeCompare(String(b.siteName || ''), 'ko')
  );
}

export async function saveLoginCredential(data) {
  await assertActiveAdmin('로그인 정보 저장');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  // 수정(id 존재) 시 기존 레코드를 읽어 병합한다(createdAt·미전달 필드 보존).
  const existing = data?.id != null ? await getById(STORE, data.id) : null;
  return put(STORE, buildCredential(data, existing || {}));
}

export async function removeLoginCredential(id) {
  await assertActiveAdmin('로그인 정보 삭제');
  await initSharedDB();
  if (!hasStore(STORE)) return;
  return deleteById(STORE, id);
}

export function credentialSiteHref(credential) {
  return normalizeUrl(credential?.siteUrl);
}
