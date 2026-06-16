export function MenuCodeDropdownOption({ menu, isActive, index, onSelect, onHover }) {
  return (
    <button
      key={menu.code}
      onClick={() => onSelect(menu)}
      onMouseEnter={() => onHover(index)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        padding: '8px 14px',
        border: 0,
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent-text)',
          background: 'var(--accent-soft)',
          padding: '1px 6px',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {menu.code}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            color: isActive ? 'var(--accent-text)' : 'var(--text-1)',
            fontWeight: 500,
          }}
        >
          {menu.menuName}
        </div>
        {menu.subCategory && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
            {menu.subCategory}
          </div>
        )}
      </div>
      {menu.sizes.length > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
          {[...menu.sizes].sort().join(' / ')}
        </span>
      )}
    </button>
  );
}
