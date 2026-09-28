/**
 * lib/note/edit-return.js — 편집 화면에서 "돌아갈 곳" 결정 (순수)
 *
 * 노트·샘플·시장조사는 목록/달력/보드/연구일지 등 여러 화면에서 열 수 있는데, 편집
 * 화면들은 저장·취소 후 각자의 기본 목록으로만 보냈다. 그래서 달력에서 수정했는데
 * 노트 목록으로, 노트 목록에서 샘플을 수정했는데 샘플 목록으로 튕기는 일이 있었다.
 *
 * 편집 화면을 열 때 ?from=<출처>를 붙이고, 편집 화면은 여기서 돌아갈 경로를 받는다.
 * 주소를 그대로 받지 않고 아는 출처만 매핑한다.
 */

const ORIGINS = Object.freeze({
  note: '/note',
  board: '/note/board',
  calendar: '/note/calendar',
  journal: '/note/journal',
  sample: '/note/sample',
  market: '/note/market',
});

/** 노트 id처럼 경로 한 조각으로 안전하게 쓸 수 있는 값인지. */
function isSafeSegment(value) {
  return /^[A-Za-z0-9:_-]+$/.test(String(value || ''));
}

/**
 * @param {string} search location.search (예: '?from=journal')
 * @param {string} fallback 출처가 없거나 모르는 값일 때 갈 곳
 * @returns {string}
 */
export function resolveEditReturn(search, fallback) {
  const params = new URLSearchParams(String(search || ''));
  const from = params.get('from') || '';
  const backId = params.get('backId') || '';
  // 노트 편집 화면의 "관련 샘플"처럼 특정 노트로 정확히 되돌려야 하는 경우
  if (from === 'note' && isSafeSegment(backId)) return `/note/${backId}`;
  return ORIGINS[from] || fallback;
}

/** 편집 화면을 열 때 붙일 쿼리. 출처가 없으면 빈 문자열. */
export function editReturnQuery(from, backId) {
  if (!ORIGINS[from]) return '';
  const params = new URLSearchParams({ from });
  if (from === 'note' && isSafeSegment(backId)) params.set('backId', String(backId));
  return `?${params.toString()}`;
}

export { ORIGINS as EDIT_RETURN_ORIGINS };
