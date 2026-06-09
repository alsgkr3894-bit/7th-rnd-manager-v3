/**
 * lib/ui/click-origin.js — 마지막 포인터 클릭 위치 추적
 *
 * 모달이 "사용자가 누른 곳에서 펼쳐지도록" transform-origin을 계산하기 위해
 * 전역에서 마지막 클릭 좌표(viewport 기준)를 기록한다.
 * capture 단계로 듣기 때문에 모달을 여는 클릭이 모달 마운트보다 먼저 기록된다.
 */

let lastClick = null;
let bound = false;

export function normalizeClickPoint(event, timestamp = Date.now()) {
  const x = Number(event?.clientX);
  const y = Number(event?.clientY);
  const t = Number(timestamp);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(t)) return null;
  return { x, y, t };
}

export function normalizeClickMaxAge(value, fallback = 1500) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function onPointerDown(e) {
  const point = normalizeClickPoint(e);
  if (point) lastClick = point;
}

/** 앱 시작 시 1회 호출 — 포인터 추적 시작 (중복 호출 안전) */
export function initClickOrigin() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  window.addEventListener('pointerdown', onPointerDown, true);
}

/**
 * 최근(maxAgeMs 이내) 클릭 좌표 반환. 없거나 오래됐으면 null
 * (키보드 단축키 등으로 열린 모달은 null → 기본 중앙 origin 유지).
 */
export function getRecentClickPoint(maxAgeMs = 1500) {
  if (!lastClick) return null;
  if (Date.now() - lastClick.t > normalizeClickMaxAge(maxAgeMs)) return null;
  return { x: lastClick.x, y: lastClick.y };
}
