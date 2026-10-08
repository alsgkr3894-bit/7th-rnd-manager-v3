/**
 * lib/ui/unsaved-changes.js — 저장 안 한 변경사항 공용 목록
 *
 * 작성 화면(노트 작성·수정, 식자재 폼, 연구일지 등)은 `useBeforeUnload(isDirty)`로 자신의
 * 저장 안 한 상태를 여기에 등록한다. 사이드바·상단바·검색창·단축키·브랜드 전환·링크 같은
 * "다른 화면으로 가는" 입구는 이동 직전에 `confirmUnsavedLeave()`로 물어본다.
 * 전엔 탭을 닫을 때만 경고해서 사이드바 클릭 한 번에 작성하던 내용이 사라졌다.
 *
 * 브라우저 뒤로가기는 막지 않는다 — Next가 popstate를 먼저 처리해 되돌릴 수 없고,
 * 막으려고 기록(history)을 덧붙이면 저장 후 router.replace로 "수정 화면으로 돌아오지 않게"
 * 한 기존 동작이 깨진다.
 */

const entries = new Map();
let nextId = 1;
// 확인창에서 "이동"을 고른 직후의 짧은 시간 — 같은 클릭이 링크 가로채기와 이동 함수 두 곳을
// 지날 때(사이드바 로고 등) 확인창이 두 번 뜨지 않게 한다.
const APPROVAL_WINDOW_MS = 1500;
let approvedUntil = 0;

/** 저장 안 한 변경이 있다고 등록한다. 반환 함수를 부르면 등록이 해제된다. */
export function registerUnsavedChanges(message) {
  const id = nextId;
  nextId += 1;
  entries.set(id, message);
  return () => {
    entries.delete(id);
  };
}

export function hasUnsavedChanges() {
  return entries.size > 0;
}

/**
 * 이동해도 되는지 확인한다. 저장 안 한 변경이 없거나 사용자가 "이동"을 고르면 true.
 * 여러 화면이 등록돼 있으면 가장 나중에 등록된 문구를 보여준다.
 */
export function confirmUnsavedLeave(now = Date.now()) {
  if (entries.size === 0) return true;
  if (typeof window === 'undefined') return true;
  if (now < approvedUntil) return true;
  const message = [...entries.values()].pop();
  const ok = window.confirm(message);
  if (ok) approvedUntil = now + APPROVAL_WINDOW_MS;
  return ok;
}

/** 테스트용 — 등록 상태를 비운다. */
export function resetUnsavedChanges() {
  entries.clear();
  approvedUntil = 0;
}

/**
 * 이 링크 클릭이 "다른 화면으로 떠나는" 클릭인지 판정한다(순수 — 클릭 가로채기와 테스트가 공유).
 * 새 탭/창, 다운로드, 다른 사이트(탭 닫기 경고가 처리), 같은 경로(쿼리·해시만 다름 — 화면 상태가
 * 유지됨)는 떠나는 것이 아니다.
 *
 * @param {{ button?: number, metaKey?: boolean, ctrlKey?: boolean, shiftKey?: boolean,
 *           altKey?: boolean, defaultPrevented?: boolean }} click
 * @param {{ target?: string, hasDownload?: boolean, origin: string, pathname: string }} link
 * @param {{ origin: string, pathname: string }} current
 */
export function isLeavingLinkClick(click, link, current) {
  if (click.defaultPrevented || (click.button ?? 0) !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasDownload) return false;
  if (link.origin !== current.origin) return false;
  if (link.pathname === current.pathname) return false;
  return true;
}
