/**
 * lib/sensitive-stores.js — 평문 비밀번호·결제내역이 담긴 store
 *
 * - 서버로 보내지 않는다(lib/server/sensitive-stores.js)
 * - 백업 파일에는 직접 고른 경우에만 담는다(lib/db/backup.js)
 */
export const SENSITIVE_STORE_NAMES = new Set([
  'rnd_login_credentials',
  'rnd_corporate_card_entries',
]);

/**
 * 백업의 stores 묶음에 민감 store가 들어 있는지.
 * 빈 배열이어도 참이다 — 그 파일을 복원하면 현재 데이터가 지워진다.
 */
export function hasSensitiveStores(stores) {
  return [...SENSITIVE_STORE_NAMES].some(name => Array.isArray(stores?.[name]));
}
