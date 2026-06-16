import { MenuCodeDropdownOption } from './MenuCodeDropdownOption';

export function MenuCodeDropdown({ results, activeIdx, listRef, onSelect, onHover }) {
  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-md)',
        maxHeight: 260,
        overflowY: 'auto',
        marginTop: 2,
      }}
    >
      {results.map((menu, index) => (
        <MenuCodeDropdownOption
          key={menu.code}
          menu={menu}
          index={index}
          isActive={index === activeIdx}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
