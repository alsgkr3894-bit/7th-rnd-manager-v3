import { Icon } from '@/components/icons';

export function SelectedMenuCodePill({ selected, onClear }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        background: 'var(--accent-soft)',
        border: '1.5px solid var(--accent)',
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          color: 'var(--accent-text)',
          flexShrink: 0,
        }}
      >
        {selected.code}
      </span>
      <span style={{ color: 'var(--text-2)' }}>{selected.menuName}</span>
      {selected.subCategory && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-4)',
            background: 'var(--surface-2)',
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {selected.subCategory}
        </span>
      )}
      {selected.sizes.length > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
          ({[...selected.sizes].sort().join(' · ')})
        </span>
      )}
      <button
        aria-label="선택 해제"
        title="선택 해제"
        onClick={onClear}
        style={{
          marginLeft: 'auto',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <Icon.close style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
