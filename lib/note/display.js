import { asDisplayText } from '@/lib/ui/prop-guards';
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';

const COMMON_NOTE_DETAIL_PAIRS = [
  ['사용 재료', 'materials'],
  ['맛 평가', 'tasteEval'],
  ['상무님 평가', 'managerEval'],
  ['원가 검토', 'costNote'],
  ['개선점', 'improvements'],
  ['다음 액션', 'nextAction'],
];

const JOURNAL_NOTE_DETAIL_PAIRS = [
  ['테스트 결과', 'tasteEval'],
  ['다음 일정', 'nextAction'],
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

export function notePrimaryContentLabel(note) {
  if (isSampleRecordNote(note)) return '테스트 내용 / 조건';
  return isJournalNote(note) ? '오늘 한 일' : '핵심 테스트 내용';
}

export function noteDetailPairs(note) {
  if (isSampleRecordNote(note)) {
    return SAMPLE_NOTE_DETAIL_PAIRS.map(([label, key]) => [label, note?.[key]]);
  }
  const pairs = isJournalNote(note) ? JOURNAL_NOTE_DETAIL_PAIRS : COMMON_NOTE_DETAIL_PAIRS;
  return pairs.map(([label, key]) => [label, note?.[key]]);
}

export function noteLegacyMenuName(note) {
  const title = cleanNoteText(note?.title);
  const menuName = cleanNoteText(note?.menuName);
  if (!menuName || menuName === title) return '';
  return menuName;
}
