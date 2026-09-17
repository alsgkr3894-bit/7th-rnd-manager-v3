/**
 * app/note/market/marketPageUtils.js — 시장조사 페이지 목록·폼 표시용 순수 헬퍼
 * (그룹핑·검색·폼 기본값은 marketUtils.js, 여기는 page/컴포넌트가 쓰는 작은 파생 계산만)
 */

/** 저장된 기록의 경쟁사 이름을 중복 없이 한국어 정렬한 datalist 후보. */
export function competitorOptionsOf(rows) {
  const values = new Set(
    (Array.isArray(rows) ? rows : [])
      .map(row => String(row?.competitor || '').trim())
      .filter(Boolean)
  );
  return [...values].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** 카드에 보여줄 유효한(data 있는) 사진만 남긴다. */
export function photosOf(row) {
  return Array.isArray(row?.photos) ? row.photos.filter(photo => photo?.data) : [];
}

/** 카드 미리보기 본문 — 시장 흐름 → 참고 포인트 → 개발 방향 순으로 첫 값. */
export function previewTextOf(row) {
  return row?.marketTrend || row?.referencePoint || row?.developmentDirection || '내용 없음';
}

/** ?edit=<id>로 들어온 기록 찾기 — id 타입(숫자/문자)이 달라도 문자열로 비교. */
export function findRowById(rows, id) {
  if (id == null || id === '') return null;
  return (Array.isArray(rows) ? rows : []).find(row => String(row?.id) === String(id)) || null;
}
