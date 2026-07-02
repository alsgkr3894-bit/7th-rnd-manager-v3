import { Icon } from '@/components/icons';

export function MenuCodeSearchField({
  query,
  displayListLength,
  placeholder,
  onQueryChange,
  onOpen,
  onKeyDown,
}) {
  const disabled = displayListLength === 0;

  return (
    <div
      className="filter-search"
      style={{
        gap: 8,
        width: '100%',
        minHeight: 40,
        padding: '8px 11px',
        background: 'var(--surface)',
        border: '1.5px solid var(--border-strong)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
      onClick={onOpen}
    >
      <Icon.search style={{ width: 15, height: 15, color: 'var(--text-2)', flexShrink: 0 }} />
      <input
        value={query}
        onChange={event => onQueryChange(event.target.value)}
        onFocus={onOpen}
        onKeyDown={onKeyDown}
        placeholder={disabled ? '메뉴 마스터가 없습니다 (메뉴 마스터 먼저 등록)' : placeholder}
        disabled={disabled}
        style={{
          background: 'transparent',
          border: 0,
          outline: 0,
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontFamily: 'inherit',
          color: 'var(--text-1)',
          fontWeight: 650,
        }}
      />
    </div>
  );
}
