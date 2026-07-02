import { Icon } from '@/components/icons';

export function SelectedMenuCodePill({ selected, onClear }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: '8px 10px',
        background: 'var(--surface)',
        border: '1.5px solid var(--accent)',
        borderRadius: 8,
        fontSize: 13,
        minHeight: 38,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          color: 'var(--accent-text)',
          flexShrink: 0,
          minWidth: 82,
        }}
      >
        {selected.code}
      </span>
      <span style={{ color: 'var(--text-1)', fontWeight: 700, lineHeight: 1.25 }}>
        {selected.menuName}
      </span>
      {selected.subCategory && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-2)',
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
        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
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
