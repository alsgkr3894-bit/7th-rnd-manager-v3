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
  ['일정 내용', 'materials'],
  ['테스트/시식 결과', 'tasteEval'],
  ['특이사항', 'improvements'],
  ['다음 할 일', 'nextAction'],
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

export function notePrimaryContentLabel(note) {
  return isJournalNote(note) ? '오늘 한 일' : '핵심 테스트 내용';
}

export function noteDetailPairs(note) {
  const pairs = isJournalNote(note) ? JOURNAL_NOTE_DETAIL_PAIRS : COMMON_NOTE_DETAIL_PAIRS;
  return pairs.map(([label, key]) => [label, note?.[key]]);
}

export function noteLegacyMenuName(note) {
  const title = cleanNoteText(note?.title);
  const menuName = cleanNoteText(note?.menuName);
  if (!menuName || menuName === title) return '';
  return menuName;
}
