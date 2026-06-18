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
    <div className="filter-search" style={{ gap: 6 }} onClick={onOpen}>
      <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
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
          fontSize: 13,
          fontFamily: 'inherit',
          color: 'var(--text-1)',
        }}
      />
    </div>
  );
}
