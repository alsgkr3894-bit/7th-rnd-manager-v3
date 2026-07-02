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

export function normalizeNoteMenuCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function dateCode(value) {
  const fallback = new Date().toISOString().slice(0, 10);
  const raw = String(value || fallback).replace(/\D/g, '');
  return raw.length >= 8 ? raw.slice(2, 8) : raw.padEnd(6, '0').slice(0, 6);
}

export function generateNextNoteMenuCode(notes = [], { date, prefix = 'RND' } = {}) {
  const safePrefix = normalizeNoteMenuCode(prefix) || 'RND';
  const day = dateCode(date);
  const head = `${safePrefix}-${day}-`;
  const used = new Set(
    (Array.isArray(notes) ? notes : [])
      .map(note => normalizeNoteMenuCode(note?.menuCode))
      .filter(Boolean)
  );
  let maxSeq = 0;

  for (const code of used) {
    if (!code.startsWith(head)) continue;
    const seq = Number(code.slice(head.length));
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${head}${nextSeq}`;
  while (used.has(candidate)) {
    nextSeq += 1;
    candidate = `${head}${nextSeq}`;
  }
  return candidate;
}

export function formatTestRound(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.endsWith('차') ? text : `${text}차`;
}

export function buildPreviousRoundDraft(source = {}, current = {}) {
  const menuCode = normalizeNoteMenuCode(source.menuCode || current.menuCode);
  const title =
    source.title || source.menuName || current.title || current.menuName || menuCode || '';
  const sourceRound = String(source.testRound || '').trim();
  return {
    ...current,
    brand: source.brand || current.brand,
    menuCode,
    title,
    menuName: title,
    testRound: sourceRound ? incrementTestRound(sourceRound) : '1',
    menuTestMode: 'existing',
    parentId: source.id ?? source.parentId ?? current.parentId ?? null,
  };
}
