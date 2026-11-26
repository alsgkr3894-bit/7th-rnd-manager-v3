/**
 * lib/server/browser-settings.js — 브라우저 화면 설정의 서버 보관 (local_storage_entries)
 *
 * DB 백업에 설정이 함께 담기고, '서버에서 불러오기'가 되돌려 준다.
 * 이 경로로 저장한 행만 돌려준다 — 예전에 백업에서 한 번 가져온 행은 낡은 값이라 쓰지 않는다.
 */
import {
  MAX_SETTING_KEYS,
  MAX_SETTING_VALUE_CHARS,
  isServerSettingKey,
} from '@/lib/settings-sync/keys';

export const SETTINGS_BRAND_ID = 'main';
export const SETTINGS_SOURCE = 'settings-sync';

export class SettingsValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SettingsValidationError';
  }
}

/** 요청 본문 → [키, 값] 목록. 허용되지 않은 키가 하나라도 있으면 거부한다 */
export function normalizeSettingsPayload(payload) {
  const values = payload?.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new SettingsValidationError('values 객체가 필요합니다.');
  }
  const entries = Object.entries(values);
  if (entries.length === 0 || entries.length > MAX_SETTING_KEYS) {
    throw new SettingsValidationError('설정 개수가 올바르지 않습니다.');
  }
  for (const [key, value] of entries) {
    if (!isServerSettingKey(key)) {
      throw new SettingsValidationError('서버에 보관하지 않는 설정 키입니다.');
    }
    if (typeof value !== 'string' || value.length > MAX_SETTING_VALUE_CHARS) {
      throw new SettingsValidationError('설정 값이 올바르지 않습니다.');
    }
  }
  return entries;
}

export async function readBrowserSettings(prisma) {
  const rows = await prisma.localStorageEntry.findMany({
    where: { brandId: SETTINGS_BRAND_ID },
    select: { key: true, value: true, metadata: true },
  });
  return Object.fromEntries(
    rows
      .filter(row => row.metadata?.source === SETTINGS_SOURCE && isServerSettingKey(row.key))
      .map(row => [row.key, row.value])
  );
}

export async function writeBrowserSettings(prisma, payload) {
  const entries = normalizeSettingsPayload(payload);
  const metadata = { source: SETTINGS_SOURCE };
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.localStorageEntry.upsert({
        where: { brandId_key: { brandId: SETTINGS_BRAND_ID, key } },
        update: { value, metadata },
        create: { brandId: SETTINGS_BRAND_ID, key, value, metadata },
      })
    )
  );
  return { ok: true, saved: entries.length };
}
