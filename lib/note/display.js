import { asDisplayText } from '@/lib/ui/prop-guards';
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { journalReportText } from '@/lib/note/journal-report';

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
  return note?._recordKind === 'sample' || String(note?.id || '').startsWith('sample:');
}

export function isMarketResearchNote(note) {
  return note?._recordKind === 'market_research' || String(note?.id || '').startsWith('market:');
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
