export function MenuCodeDropdownOption({ menu, isActive, index, onSelect, onHover }) {
  const meta = [menu.category, menu.subCategory].filter(Boolean).join(' · ');

  return (
    <button
      key={menu.code}
      type="button"
      onClick={() => onSelect(menu)}
      onMouseEnter={() => onHover(index)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '11px 12px',
        border: 0,
        borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
        cursor: 'pointer',
        borderBottom: '1px solid var(--divider)',
        fontFamily: 'inherit',
        color: 'var(--text-1)',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12.5,
          fontWeight: 800,
          color: isActive ? 'var(--surface)' : 'var(--accent-text)',
          background: isActive ? 'var(--accent)' : 'var(--accent-soft)',
          padding: '4px 7px',
          borderRadius: 6,
          flexShrink: 0,
          minWidth: 82,
          textAlign: 'center',
        }}
      >
        {menu.code}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            color: isActive ? 'var(--accent-text)' : 'var(--text-1)',
            fontWeight: 800,
            lineHeight: 1.25,
            whiteSpace: 'normal',
          }}
        >
          {menu.menuName}
        </div>
        {meta && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, fontWeight: 600 }}>
            {meta}
          </div>
        )}
      </div>
      {menu.sizes.length > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--text-2)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: '3px 7px',
            flexShrink: 0,
          }}
        >
          {[...menu.sizes].sort().join(' / ')}
        </span>
      )}
    </button>
  );
}
