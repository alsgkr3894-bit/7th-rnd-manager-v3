/**
 * lib/db/sync-mode.js — 이 브라우저가 "쓰기 권한이 있는 운영 PC"인지 판정
 *
 * 사내 LAN 배포에서 운영 PC 1대만 Next + Postgres를 돌리고, 나머지 PC는 브라우저로 접속해
 * 데이터를 조회한다. 문제는 뷰어 브라우저의 IndexedDB가 비어 있다는 것이다 — 그대로 두면
 * 자동 푸시 동기화(`lib/db/server-sync.js`)가 그 빈 상태를 서버로 밀어 올려 데이터를
 * 파괴하거나 `__client:` 분기 행을 양산한다.
 *
 * 판정 기준은 **접속한 호스트**다. 배포 형태와 1:1로 맞아떨어지기 때문이다:
 *   운영 PC → http://localhost:3000  (루프백)
 *   뷰어 PC → http://192.168.x.x:3000
 * 설정할 것이 없고, 모르는 호스트는 READONLY로 **닫히는 쪽으로 실패**한다.
 *
 * 운영자가 일부러 운영 PC를 LAN IP로 열어 쓰는 경우를 위해 localStorage 오버라이드를 둔다.
 *
 * 주의: 이 모듈은 `lib/auth/*` 에서 아무것도 import하면 안 된다.
 * `lib/auth/accounts.js` 가 이 모듈을 import하므로 순환이 생긴다.
 *
 * NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY=1 이면 localStorage 오버라이드·호스트 판정보다
 * 먼저 무조건 READONLY로 고정한다. 브라우저 검증/샌드박스 실행용(scripts/dev-sandbox.mjs)
 * 도 localhost라 호스트 판정만으로는 authoritative로 잡혀 실서버에 그대로 쓰기 동기화를
 * 해버린다 — 이 실수로 실데이터가 덮어써진 사고가 있었다(2026-09-17). 사용자가 화면에서
 * "운영 PC로 지정"을 눌러도 이 플래그가 켜져 있으면 뒤집을 수 없다(의도적으로 override보다 우선).
 */

export const SYNC_MODE = {
  AUTHORITATIVE: 'authoritative',
  READONLY: 'readonly',
};

const OVERRIDE_KEY = 'v3:server-sync-mode';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '']);

/** 환경변수로 읽기 전용이 강제됐는지 — 샌드박스 dev 서버용. */
export function isSyncModeForcedReadonly() {
  return process.env.NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY === '1';
}

function readOverride() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = String(localStorage.getItem(OVERRIDE_KEY) || '').trim();
    return raw === SYNC_MODE.AUTHORITATIVE || raw === SYNC_MODE.READONLY ? raw : null;
  } catch {
    return null;
  }
}

function currentHostname() {
  try {
    if (typeof window === 'undefined') return '';
    return String(window.location?.hostname || '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * 현재 브라우저의 동기화 모드.
 * SSR(window 없음)에서는 푸시가 일어나지 않으므로 AUTHORITATIVE로 둬도 무해하다.
 * @returns {'authoritative'|'readonly'}
 */
export function resolveSyncMode() {
  if (isSyncModeForcedReadonly()) return SYNC_MODE.READONLY;
  if (typeof window === 'undefined') return SYNC_MODE.AUTHORITATIVE;
  const override = readOverride();
  if (override) return override;
  return LOOPBACK_HOSTNAMES.has(currentHostname()) ? SYNC_MODE.AUTHORITATIVE : SYNC_MODE.READONLY;
}

/** 이 브라우저가 서버로 쓰기를 밀어 올려도 되는가. */
export function isAuthoritativeClient() {
  return resolveSyncMode() === SYNC_MODE.AUTHORITATIVE;
}

/**
 * 모드를 수동으로 고정하거나(null이면) 자동 판정으로 되돌린다.
 * @param {'authoritative'|'readonly'|null} mode
 */
export function setSyncModeOverride(mode) {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (mode == null) {
      localStorage.removeItem(OVERRIDE_KEY);
      return true;
    }
    if (mode !== SYNC_MODE.AUTHORITATIVE && mode !== SYNC_MODE.READONLY) return false;
    localStorage.setItem(OVERRIDE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

/** UI 표시용 — 오버라이드로 고정된 상태인지. */
export function hasSyncModeOverride() {
  return readOverride() != null;
}
