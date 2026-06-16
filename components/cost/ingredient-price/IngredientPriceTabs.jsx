'use client';

export function IngredientPriceTabs({ tabs, activeTab, issueCount, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        width: 'fit-content',
        marginBottom: 12,
      }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '7px 20px',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === key ? 'var(--accent)' : 'var(--surface-2)',
            color: activeTab === key ? 'var(--surface)' : 'var(--text-2)',
            position: 'relative',
          }}
        >
          {label}
          {key === 'issues' && issueCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: 'var(--warn)',
                color: 'var(--surface)',
                fontSize: 9,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {issueCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
