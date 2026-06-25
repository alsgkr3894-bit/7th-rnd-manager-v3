import { clampInteger } from '@/lib/ui/prop-guards';

export const NOTE_EVALUATION_FIELDS = [
  { key: 'tasteRating', label: '맛' },
  { key: 'textureRating', label: '식감' },
  { key: 'appearanceRating', label: '외관' },
];

export function clampNoteRating(value) {
  return clampInteger(value, { min: 0, max: 5, fallback: 0 });
}

export function formatNoteRating(value) {
  const rating = clampNoteRating(value);
  if (rating <= 0) return '';
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`;
}

export function incrementTestRound(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/\d+/);
  if (!match) return text ? `${text} 다음` : '1';
  const next = String(Number(match[0]) + 1);
  return text.slice(0, match.index) + next + text.slice(match.index + match[0].length);
}

export function formatTestRound(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.endsWith('차') ? text : `${text}차`;
}

export function buildPreviousRoundDraft(source = {}, current = {}) {
  const title = source.title || source.menuName || current.title || current.menuName || '';
  return {
    ...current,
    brand: source.brand || current.brand,
    title,
    menuName: title,
    testRound: incrementTestRound(source.testRound || current.testRound),
    parentId: source.id ?? source.parentId ?? current.parentId ?? null,
  };
}
