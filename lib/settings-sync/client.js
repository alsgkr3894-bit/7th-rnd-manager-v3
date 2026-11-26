/**
 * lib/settings-sync/client.js — 브라우저 설정을 서버에 올리고 되받는다
 *
 * 올리기: 운영 PC(authoritative) 브라우저만, 바뀐 설정만.
 *   이 브라우저가 처음 올릴 때는 서버에 '없는' 설정만 올린다 — 새 프로필이나 가끔 쓰는 브라우저가
 *   서버의 설정을 기본값·낡은 값으로 덮지 않게.
 *   앱을 새로 열 때마다 서버에 빠진 설정이 있는지도 본다(서버 DB를 되돌렸거나 다시 가져온 경우).
 *   '서버로 전체 재전송'은 모든 설정을 다시 올린다.
 * 받기: '서버에서 불러오기' 때 적용한다.
 */
import { fetchAppJson } from '@/lib/session';
import { collectLocalStorage, restoreLocalStorage } from '@/lib/backup/local-storage-keys';
import { applyAllSettings } from '@/lib/settings';
import { isAuthoritativeClient, isSyncModeForcedReadonly } from '@/lib/db/sync-mode';
import { ensureSyncGuardEvaluated, isSyncGuardBlocked } from '@/lib/db/sync-guard';
import { MAX_SETTING_VALUE_CHARS, SERVER_SETTING_KEYS, isServerSettingKey } from './keys';

export const SETTINGS_SYNC_STATE_KEY = 'v3:settings-sync:state';
// 한 번에 보내는 설정의 상한 — 서버 본문 한도를 넘지 않게 나눠 보낸다
export const BATCH_MAX_KEYS = 100;
export const BATCH_MAX_BYTES = 2 * 1024 * 1024;

/** 이 브라우저의 서버 보관 대상 설정 */
export function collectServerSettings() {
  const all = collectLocalStorage(SERVER_SETTING_KEYS);
  return Object.fromEntries(Object.entries(all).filter(([key]) => isServerSettingKey(key)));
}

// 바뀌었는지만 알면 되므로 값 대신 짧은 지문을 남긴다 (FNV-1a)
function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

const fingerprintsOf = values =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, fingerprint(value)]));

export function readSettingsSyncState() {
  try {
    const state = JSON.parse(localStorage.getItem(SETTINGS_SYNC_STATE_KEY) || 'null');
    return state && typeof state.prints === 'object' ? state : null;
  } catch {
    return null;
  }
}

function writeSettingsSyncState(values) {
  try {
    localStorage.setItem(
      SETTINGS_SYNC_STATE_KEY,
      JSON.stringify({ at: new Date().toISOString(), prints: fingerprintsOf(values) })
    );
  } catch (error) {
    console.warn('[settings-sync] 상태 저장 실패:', error?.message);
  }
}

/** [키, 값] 목록을 서버 한도 안의 묶음으로 나눈다 */
export function batchSettings(entries) {
  const encoder = new TextEncoder();
  const batches = [];
  let batch = [];
  let bytes = 0;
  for (const entry of entries) {
    const size = encoder.encode(JSON.stringify(entry)).length;
    if (batch.length > 0 && (batch.length >= BATCH_MAX_KEYS || bytes + size > BATCH_MAX_BYTES)) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(entry);
    bytes += size;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

let pushing = null;
let serverChecked = false; // 이 앱 실행에서 서버에 빠진 설정이 있는지 확인했는가

async function entriesToSend(values, all) {
  const entries = Object.entries(values);
  if (all) return entries;
  const state = readSettingsSyncState();
  const changed = ([key, value]) => state && state.prints[key] !== fingerprint(value);
  if (state && serverChecked) return entries.filter(changed);
  const server = (await fetchAppJson('/api/db/settings')).values || {};
  return entries.filter(entry => !(entry[0] in server) || changed(entry));
}

async function runPush({ all = false } = {}) {
  if (isSyncModeForcedReadonly() || !isAuthoritativeClient()) return { skipped: 'readonly' };
  // 서버 동기화를 끈 환경(QA 등)에서는 설정도 올리지 않는다
  if (globalThis.__RND_DISABLE_SERVER_STORE_SYNC__ === true) return { skipped: 'disabled' };
  await ensureSyncGuardEvaluated();
  // 서버에서 불러오기 전의 빈 브라우저는 아무것도 올리지 않는다
  if (isSyncGuardBlocked()) return { skipped: 'guard' };

  const values = collectServerSettings();
  const wanted = await entriesToSend(values, all);
  // 서버가 받지 않는 크기의 값 하나 때문에 다른 설정까지 막히지 않게 뺀다
  const sendable = wanted.filter(([key, value]) => {
    if (value.length <= MAX_SETTING_VALUE_CHARS) return true;
    console.warn(`[settings-sync] '${key}' 설정이 너무 커서 서버에 보관하지 않습니다.`);
    return false;
  });
  for (const batch of batchSettings(sendable)) {
    await fetchAppJson('/api/db/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values: Object.fromEntries(batch) }),
    });
  }
  // 보내기에 성공한 뒤에만 표시한다 — 중간에 실패하면 다음에 서버를 다시 확인한다
  serverChecked = true;
  writeSettingsSyncState(values);
  return { saved: sendable.length };
}

/**
 * 바뀐 설정을 서버에 올린다. 동시에 불려도 한 번만 실행한다.
 * @param {{ all?: boolean }} [options] all: 모든 설정을 다시 올린다(진행 중인 올리기가 끝난 뒤)
 */
export function pushSettingsToServer(options = {}) {
  if (pushing && !options.all) return pushing;
  const previous = pushing ? pushing.catch(() => null) : Promise.resolve();
  const current = previous
    .then(() => runPush(options))
    .finally(() => {
      if (pushing === current) pushing = null;
    });
  pushing = current;
  return current;
}

/** 서버의 설정을 이 브라우저에 적용한다. 계정 선택은 바꾸지 않고, 브랜드 목록은 합친다 */
export async function pullSettingsFromServer() {
  const server = (await fetchAppJson('/api/db/settings')).values || {};
  const applied = restoreLocalStorage(server, undefined, {
    skipAccountKeys: true,
    mergeBrandMaster: true,
  });
  applyAllSettings();
  // 방금 받은 값은 다시 올리지 않는다
  writeSettingsSyncState(collectServerSettings());
  return { applied };
}
