/**
 * lib/settings-sync/client.js — 브라우저 설정을 서버에 올리고 되받는다
 *
 * 올리기: 운영 PC(authoritative) 브라우저만, 바뀐 설정만.
 *   이 브라우저가 처음 올릴 때는 서버에 '없는' 설정만 올린다 — 새 프로필이나 가끔 쓰는 브라우저가
 *   서버의 설정을 기본값·낡은 값으로 덮지 않게.
 * 받기: '서버에서 불러오기' 때 적용한다.
 */
import { fetchAppJson } from '@/lib/session';
import { collectLocalStorage, restoreLocalStorage } from '@/lib/backup/local-storage-keys';
import { applyAllSettings } from '@/lib/settings';
import { isAuthoritativeClient, isSyncModeForcedReadonly } from '@/lib/db/sync-mode';
import { ensureSyncGuardEvaluated, isSyncGuardBlocked } from '@/lib/db/sync-guard';
import { SERVER_SETTING_KEYS, isServerSettingKey } from './keys';

export const SETTINGS_SYNC_STATE_KEY = 'v3:settings-sync:state';

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

let pushing = null;

async function runPush() {
  if (isSyncModeForcedReadonly() || !isAuthoritativeClient()) return { skipped: 'readonly' };
  // 서버 동기화를 끈 환경(QA 등)에서는 설정도 올리지 않는다
  if (globalThis.__RND_DISABLE_SERVER_STORE_SYNC__ === true) return { skipped: 'disabled' };
  await ensureSyncGuardEvaluated();
  // 서버에서 불러오기 전의 빈 브라우저는 아무것도 올리지 않는다
  if (isSyncGuardBlocked()) return { skipped: 'guard' };

  const values = collectServerSettings();
  const state = readSettingsSyncState();
  let changed;
  if (state) {
    changed = Object.entries(values).filter(
      ([key, value]) => state.prints[key] !== fingerprint(value)
    );
  } else {
    const server = (await fetchAppJson('/api/db/settings')).values || {};
    changed = Object.entries(values).filter(([key]) => !(key in server));
  }
  if (changed.length > 0) {
    await fetchAppJson('/api/db/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values: Object.fromEntries(changed) }),
    });
  }
  writeSettingsSyncState(values);
  return { saved: changed.length };
}

/** 바뀐 설정을 서버에 올린다. 동시에 불려도 한 번만 실행한다 */
export function pushSettingsToServer() {
  if (!pushing) {
    pushing = runPush().finally(() => {
      pushing = null;
    });
  }
  return pushing;
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
