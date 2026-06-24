import { asDisplayText } from '@/lib/ui/prop-guards';

function cleanNoteText(value) {
  const text = asDisplayText(value).trim();
  return text && text !== '0' ? text : '';
}

export function noteDisplayTitle(note, fallback = '제목 없음') {
  return cleanNoteText(note?.title) || cleanNoteText(note?.menuName) || fallback;
}

export function noteLegacyMenuName(note) {
  const title = cleanNoteText(note?.title);
  const menuName = cleanNoteText(note?.menuName);
  if (!menuName || menuName === title) return '';
  return menuName;
}
