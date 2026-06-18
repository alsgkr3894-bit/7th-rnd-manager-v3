export const ACCOUNT_ROLES = ['admin', 'viewer'];
export const ROLE_LABELS = { admin: '관리자', viewer: '조회자' };
export const ACTIVE_ACCOUNT_KEY = 'rnd_active_account_id';
export const ACTIVE_ACCOUNT_KEY_PREFIX = `${ACTIVE_ACCOUNT_KEY}:`;

function normalizeAccountBrandId(value) {
  const text = String(value || 'main')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return text || 'main';
}

export function activeAccountKeyForBrand(brandId = 'main') {
  return `${ACTIVE_ACCOUNT_KEY_PREFIX}${normalizeAccountBrandId(brandId)}`;
}

export function isActiveAccountStorageKey(key) {
  return (
    key === ACTIVE_ACCOUNT_KEY ||
    (typeof key === 'string' &&
      key.startsWith(ACTIVE_ACCOUNT_KEY_PREFIX) &&
      key.length > ACTIVE_ACCOUNT_KEY_PREFIX.length)
  );
}
