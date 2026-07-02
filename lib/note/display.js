import { asDisplayText } from '@/lib/ui/prop-guards';

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

export function noteLegacyMenuName(note) {
  const title = cleanNoteText(note?.title);
  const menuName = cleanNoteText(note?.menuName);
  if (!menuName || menuName === title) return '';
  return menuName;
}
