/**
 * lib/settings-sync/keys.js — 서버에 함께 보관하는 브라우저 설정 키 (브라우저·서버 공용)
 *
 * 백업에 담는 영속 설정 중 '이 브라우저에서 고른 계정'은 기기마다 다른 값이라 뺀다.
 * 로그인정보·법인카드·로그인 인증값은 설정 키가 아니며 서버로 보내지 않는다.
 */
import { PERSISTENT_LS_KEYS, isSavedViewStorageKey } from '@/lib/backup/local-storage-keys';
import { isActiveAccountStorageKey } from '@/lib/auth/account-constants';

export const SERVER_SETTING_KEYS = PERSISTENT_LS_KEYS.filter(
  key => !isActiveAccountStorageKey(key)
);
const SERVER_SETTING_SET = new Set(SERVER_SETTING_KEYS);

export function isServerSettingKey(key) {
  return SERVER_SETTING_SET.has(key) || isSavedViewStorageKey(key);
}

export const MAX_SETTING_KEYS = 300;
export const MAX_SETTING_VALUE_CHARS = 1024 * 1024;
