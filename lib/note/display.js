import { asDisplayText } from '@/lib/ui/prop-guards';
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { journalReportText } from '@/lib/note/journal-report';
import { isUnifiedMarketResearchRecord, isUnifiedSampleRecord } from '@/lib/note/record-kind';

const COMMON_NOTE_DETAIL_PAIRS = [
  ['사용 재료', 'materials'],
  ['맛 평가', 'tasteEval'],
  ['상무님 평가', 'managerEval'],
  ['원가 검토', 'costNote'],
  ['개선점', 'improvements'],
  ['다음 액션', 'nextAction'],
];

const SAMPLE_NOTE_DETAIL_PAIRS = [
  ['샘플명', 'materials'],
  ['평가 / 결과', 'tasteEval'],
  ['업체명', 'company'],
  ['담당자', 'tester'],
  ['단가', 'costNote'],
  ['개선사항', 'improvements'],
  ['다음 액션', 'nextAction'],
];

const MARKET_RESEARCH_NOTE_DETAIL_PAIRS = [
  ['경쟁사 / 키워드', 'materials'],
  ['시장 흐름 / 트렌드', 'tasteEval'],
  ['참고 포인트 / 개발 방향', 'improvements'],
  ['다음 액션', 'nextAction'],
];

function cleanNoteText(value) {
  const text = asDisplayText(value)
    .replace(/^[\s\u200B-\u200D\uFEFF]+/, '')
    .trim();
  const invisibleOrSpace = '[\\s\\u200B-\\u200D\\uFEFF]*';
  const withoutZeroPrefix = text.replace(
    new RegExp(`^0+(?=${invisibleOrSpace}[^\\d\\s])${invisibleOrSpace}`),
    ''
  );
  return withoutZeroPrefix && withoutZeroPrefix !== '0' ? withoutZeroPrefix : '';
}

export function noteDisplayTitle(note, fallback = '제목 없음') {
  return (
    cleanNoteText(note?.title) ||
    cleanNoteText(note?.menuName) ||
    cleanNoteText(note?.menuCode) ||
    fallback
  );
}

export function isJournalNote(note) {
  return note?.noteType === JOURNAL_NOTE_TYPE;
}

export function isSampleRecordNote(note) {
  return isUnifiedSampleRecord(note);
}

export function isMarketResearchNote(note) {
  return isUnifiedMarketResearchRecord(note);
}

/** 태그(쉼표 문자열 또는 배열) → 빈 칸 뺀 배열. 웹 카드·PDF 공용 */
export function noteTagList(tags) {
  if (Array.isArray(tags)) return tags.map(tag => String(tag || '').trim()).filter(Boolean);
  return String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

/** 카드 머리 메타 줄 [라벨, 값] — 작성일 + 기록 종류별 구분. 웹 카드·PDF 공용 */
export function noteMetaPairs(note) {
  const pairs = [];
  if (note?.testDate) pairs.push(['작성일', note.testDate]);
  if (isSampleRecordNote(note)) {
    const type = note?.recordType || note?.noteType;
    if (type) pairs.push(['유형', type]);
    if (note?.category) pairs.push(['식자재 분류', note.category]);
    return pairs;
  }
  if (isMarketResearchNote(note)) {
    if (note?.type) pairs.push(['유형', note.type]);
    if (note?.brand) pairs.push(['브랜드 / 출처', note.brand]);
    return pairs;
  }
  if (note?.category) pairs.push(['구분', note.category]);
  return pairs;
}

export function notePrimaryContentLabel(note) {
  if (isSampleRecordNote(note)) return '테스트 내용 / 조건';
  if (isMarketResearchNote(note)) return '작업 내용';
  return isJournalNote(note) ? '오늘 내용 보고서' : '핵심 테스트 내용';
}

export function noteDetailPairs(note) {
  if (isSampleRecordNote(note)) {
    return SAMPLE_NOTE_DETAIL_PAIRS.map(([label, key]) => [label, note?.[key]]);
  }
  if (isMarketResearchNote(note)) {
    return MARKET_RESEARCH_NOTE_DETAIL_PAIRS.map(([label, key]) => [label, note?.[key]]);
  }
  // 연구일지는 보조 칸이 없다 — 옛 칸은 journalReportText가 본문에 합쳐 보여준다(noteContentSections)
  if (isJournalNote(note)) return [];
  return COMMON_NOTE_DETAIL_PAIRS.map(([label, key]) => [label, note?.[key]]);
}

/**
 * 웹 카드·PDF에 나열할 본문 칸 [라벨, 값] 목록.
 * 연구일지는 '오늘 내용 보고서' 한 칸 — 예전 보조 칸(테스트 결과·다음 일정)도
 * 본문 아래에 합쳐 보여 다시 저장하지 않은 옛 일지의 내용도 빠지지 않는다.
 */
export function noteContentSections(note) {
  if (isJournalNote(note)) return [[notePrimaryContentLabel(note), journalReportText(note)]];
  return [[notePrimaryContentLabel(note), note?.testContent], ...noteDetailPairs(note)];
}

export function noteLegacyMenuName(note) {
  const title = cleanNoteText(note?.title);
  const menuName = cleanNoteText(note?.menuName);
  if (!menuName || menuName === title) return '';
  return menuName;
}
