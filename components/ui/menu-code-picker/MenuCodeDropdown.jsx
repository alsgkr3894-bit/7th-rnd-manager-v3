import { MenuCodeDropdownOption } from './MenuCodeDropdownOption';

export function MenuCodeDropdown({
  results,
  activeIdx,
  listRef,
  minWidth = 380,
  maxHeight = 340,
  onSelect,
  onHover,
}) {
  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        zIndex: 1200,
        width: 'max(100%, 380px)',
        minWidth,
        maxWidth: 'min(560px, 72vw)',
        background: 'var(--surface)',
        backgroundClip: 'padding-box',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        boxShadow: '0 18px 46px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(15, 23, 42, 0.08)',
        maxHeight,
        overflow: 'hidden',
        opacity: 1,
        isolation: 'isolate',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          padding: '9px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text-3)',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <span>검색 결과 {results.length}개</span>
        <span>↑↓ 이동 · Enter 선택</span>
      </div>
      <div style={{ maxHeight: Math.max(180, maxHeight - 34), overflowY: 'auto' }}>
        {results.length > 0 ? (
          results.map((menu, index) => (
            <MenuCodeDropdownOption
              key={menu.code}
              menu={menu}
              index={index}
              isActive={index === activeIdx}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))
        ) : (
          <div
            style={{
              padding: '18px 14px',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'center',
              background: 'var(--surface)',
            }}
          >
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
