'use client';

export function SampleCompareBar({ compareMode, compareCount, onOpenCompare }) {
  if (!compareMode || compareCount < 2) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        color: 'var(--surface)',
        borderRadius: 40,
        padding: '12px 28px',
        fontWeight: 800,
        fontSize: 15,
        boxShadow: 'var(--shadow-lg)',
        cursor: 'pointer',
        zIndex: 200,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
      onClick={onOpenCompare}
    >
      {compareCount}개 비교하기
    </div>
  );
}
