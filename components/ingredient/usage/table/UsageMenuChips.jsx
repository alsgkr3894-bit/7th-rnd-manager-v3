import { CAT_COLORS } from '../usage-display-utils';

const FALLBACK_MENU_COLOR = {
  bg: 'var(--surface-2)',
  color: 'var(--text-3)',
};

export function UsageMenuChips({
  row,
  open,
  more,
  visibleMenus,
  visibleCount,
  rowKey,
  onToggleRow,
  onExcludeMenu,
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {visibleMenus.map(menu => (
        <UsageMenuChip key={menu.menuName} menu={menu} onExcludeMenu={onExcludeMenu} />
      ))}
      {!open && more > 0 && (
        <button
          onClick={() => onToggleRow(rowKey)}
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            border: 0,
            background: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            fontWeight: 600,
          }}
        >
          +{more}개 더보기
        </button>
      )}
      {open && row.menus.length > visibleCount && (
        <button
          onClick={() => onToggleRow(rowKey)}
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            border: 0,
            background: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          접기
        </button>
      )}
    </div>
  );
}

function UsageMenuChip({ menu, onExcludeMenu }) {
  const color = CAT_COLORS[menu.cat] || FALLBACK_MENU_COLOR;

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 6px 2px 8px',
        borderRadius: 99,
        background: color.bg,
        color: color.color,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {menu.menuName}
      <button
        onClick={() => onExcludeMenu(menu.menuName)}
        title="이 메뉴를 사용현황 목록에서 제외"
        style={{
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.55,
          padding: 0,
          lineHeight: 1,
          fontSize: 12,
          display: 'inline-flex',
        }}
      >
        ×
      </button>
    </span>
  );
}
