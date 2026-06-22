/**
 * lib/action-center/state.js — dismiss/snooze 상태 (localStorage)
 *
 * dismiss: 영구 숨김 — 원인 데이터가 있어도 표시 안 함
 * snooze:  일시 숨김 — snoozedUntil 지나면 다시 표시
 */

const LS_KEY = 'action_center_state_v1';

function cleanActionId(id) {
  const text = String(id ?? '').trim();
  return text || null;
}

function cleanDismissed(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [id, flag] of Object.entries(value)) {
    const cleanId = cleanActionId(id);
    if (cleanId && flag === true) out[cleanId] = true;
  }
  return out;
}

function cleanSnoozed(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [id, until] of Object.entries(value)) {
    const cleanId = cleanActionId(id);
    if (typeof until !== 'number' && typeof until !== 'string') continue;
    const timestamp = Number(until);
    if (cleanId && Number.isFinite(timestamp)) out[cleanId] = timestamp;
  }
  return out;
}

function readState() {
  if (typeof localStorage === 'undefined') return { dismissed: {}, snoozed: {} };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { dismissed: {}, snoozed: {} };
    const parsed = JSON.parse(raw);
    return {
      dismissed: cleanDismissed(parsed.dismissed),
      snoozed: cleanSnoozed(parsed.snoozed),
    };
  } catch {
    return { dismissed: {}, snoozed: {} };
  }
}

function writeState(state) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** id를 영구 숨김 처리 */
export function dismissAction(id) {
  const actionId = cleanActionId(id);
  if (!actionId) return;
  const state = readState();
  state.dismissed[actionId] = true;
  delete state.snoozed[actionId];
  writeState(state);
}

/**
 * id를 일시 숨김 (snooze)
 * @param {string} id
 * @param {'1d'|'7d'|'30d'} duration
 */
export function snoozeAction(id, duration = '1d') {
  const actionId = cleanActionId(id);
  if (!actionId) return;
  const state = readState();
  const ms = duration === '30d' ? 30 * 86400_000 : duration === '7d' ? 7 * 86400_000 : 86400_000;
  state.snoozed[actionId] = Date.now() + ms;
  delete state.dismissed[actionId];
  writeState(state);
}

/** 숨김/보류 해제 */
export function undismissAction(id) {
  const actionId = cleanActionId(id);
  if (!actionId) return;
  const state = readState();
  delete state.dismissed[actionId];
  delete state.snoozed[actionId];
  writeState(state);
}

/** 모두 해제 */
export function clearAllDismissed() {
  writeState({ dismissed: {}, snoozed: {} });
}

/** 현재 상태를 반환 (ActionCenterPanel에서 filter에 사용) */
export function getActionState() {
  return readState();
}

/**
 * ActionItem 목록에서 dismiss/snooze된 항목을 걸러낸다.
 * 실제 원인 데이터가 해결되면 호출부 자체가 build에서 해당 항목을 만들지 않으므로
 * 여기서는 사용자 결정(dismiss/snooze)만 적용한다.
 */
export function filterByState(items) {
  const { dismissed, snoozed } = readState();
  const now = Date.now();
  return items.filter(item => {
    const actionId = cleanActionId(item?.id);
    if (!actionId) return true;
    if (dismissed[actionId]) return false;
    const until = snoozed[actionId];
    if (until && now < until) return false;
    return true;
  });
}

/** 숨겨진 항목 목록 — "숨김 해제" UI용 */
export function getHiddenItems(allItems) {
  const { dismissed, snoozed } = readState();
  const now = Date.now();
  return allItems.filter(item => {
    const actionId = cleanActionId(item?.id);
    if (!actionId) return false;
    if (dismissed[actionId]) return true;
    const until = snoozed[actionId];
    return until && now < until;
  });
}

/** localStorage를 한 번만 읽어 visible/hidden을 동시에 분리 */
export function partitionByState(items) {
  const { dismissed, snoozed } = readState();
  const now = Date.now();
  const visible = [];
  const hidden = [];
  for (const item of items) {
    const actionId = cleanActionId(item?.id);
    const isDismissed = actionId && dismissed[actionId] === true;
    const until = actionId ? snoozed[actionId] : undefined;
    const isSnoozed = until && now < until;
    if (isDismissed || isSnoozed) hidden.push(item);
    else visible.push(item);
  }
  return { visible, hidden };
}
