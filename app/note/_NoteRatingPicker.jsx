'use client';
import { clampNoteRating } from '@/lib/note/evaluation';

export function NoteRatingPicker({ label, value, onChange }) {
  const rating = clampNoteRating(value);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '74px minmax(0, 1fr) 42px',
        alignItems: 'center',
        gap: 10,
        minHeight: 34,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            aria-label={`${label} ${score}점`}
            onClick={() => onChange(rating === score ? 0 : score)}
            style={{
              width: 30,
              height: 30,
              display: 'inline-grid',
              placeItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: score <= rating ? 'var(--accent-soft)' : 'var(--surface)',
              color: score <= rating ? 'var(--star)' : 'var(--text-4)',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
              transition: 'transform 120ms ease, background 120ms ease',
            }}
          >
            ★
          </button>
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
        {rating || '-'} / 5
      </span>
    </div>
  );
}
