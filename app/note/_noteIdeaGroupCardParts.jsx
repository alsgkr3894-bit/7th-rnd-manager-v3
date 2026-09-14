'use client';

/** 아이디어 묶음 카드가 쓰는 작은 표시 조각·요약 헬퍼. */
import { clampNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { formatFullDate } from '@/lib/note/utils';
import { noteRoundNumber } from './noteIdeaGroups';
import { highlightText } from './_NoteCard';

export function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

export function roundLabel(note, index) {
  return formatTestRound(note.testRound) || `${noteRoundNumber(note) || index + 1}차`;
}

export function ratingSummary(note) {
  const ratings = NOTE_EVALUATION_FIELDS.map(item => clampNoteRating(note[item.key])).filter(
    value => value > 0
  );
  if (!ratings.length) return '';
  const avg = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  return `평균 ${avg.toFixed(1)}/5`;
}

export function MiniStat({ label, value }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '8px 9px',
        borderRadius: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 10,
          color: 'var(--text-4)',
          fontWeight: 800,
          marginBottom: 2,
        }}
      >
        {label}
      </span>
      <strong
        style={{
          display: 'block',
          minWidth: 0,
          fontSize: 13,
          color: 'var(--text-1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export function latestSummary(note, hlRe) {
  const value = asText(note.testContent) || asText(note.tasteEval) || asText(note.nextAction);
  return value ? highlightText(value, hlRe) : '최근 테스트 기록이 정리되어 있습니다';
}

export function previewRows(note = {}) {
  return [
    ['테스트 내용', asText(note.testContent)],
    ['맛 평가', asText(note.tasteEval)],
    ['다음 액션', asText(note.nextAction)],
  ]
    .filter(([, value]) => value)
    .slice(0, 4);
}
