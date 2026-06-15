'use client';

export const S_SECTION_TITLE_FLEX = { display: 'flex', alignItems: 'center', gap: 8 };

export const S_EMPTY_STATE = {
  height: 60,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-4)',
  fontSize: 13,
};

export const S_MOVER_LABEL = { fontSize: 11, fontWeight: 700, marginBottom: 6 };

export function SectionDot({ color }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}
