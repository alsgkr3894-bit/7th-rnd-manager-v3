/**
 * lib/note/record-kind.js — 노트 화면에 섞여 나오는 통합 기록(샘플·시장조사) 판별 (순수, 의존성 없음)
 *
 * 노트 목록·연구일지·웹 카드·PDF가 같은 판정을 각자 복사해 쓰던 것을 한곳으로 모았다.
 * 통합 기록은 `_recordKind`로, 옛 데이터는 id 접두사('sample:', 'market:')로 구분한다.
 */

export const NOTE_RECORD_KIND = Object.freeze({
  NOTE: 'note',
  SAMPLE: 'sample',
  MARKET_RESEARCH: 'market_research',
});

export const SAMPLE_ID_PREFIX = 'sample:';
export const MARKET_RESEARCH_ID_PREFIX = 'market:';

export function isUnifiedSampleId(id) {
  return typeof id === 'string' && id.startsWith(SAMPLE_ID_PREFIX);
}

export function isUnifiedMarketResearchId(id) {
  return typeof id === 'string' && id.startsWith(MARKET_RESEARCH_ID_PREFIX);
}

/** 기록 객체(또는 통합 id 문자열)가 샘플 기록인지 */
export function isUnifiedSampleRecord(record) {
  if (isUnifiedSampleId(record)) return true;
  return record?._recordKind === NOTE_RECORD_KIND.SAMPLE || isUnifiedSampleId(record?.id);
}

/** 기록 객체(또는 통합 id 문자열)가 시장조사 기록인지 */
export function isUnifiedMarketResearchRecord(record) {
  if (isUnifiedMarketResearchId(record)) return true;
  return (
    record?._recordKind === NOTE_RECORD_KIND.MARKET_RESEARCH ||
    isUnifiedMarketResearchId(record?.id)
  );
}
