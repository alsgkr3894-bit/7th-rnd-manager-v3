import { CAT_COLORS } from '../usage-display-utils';

const FALLBACK_MENU_COLOR = {
  bg: 'var(--surface-2)',
  color: 'var(--text-3)',
};

// 직접(레시피 직접 구성품) 외 출처만 작은 태그로 보여준다 — 라벨은
// lib/ingredient/usage-summary.js normalizeSource와 같은 표기를 쓴다.
const SOURCE_LABELS = { 묶음관리: '공통묶음', 엣지관리: '엣지', 파생메뉴: '파생메뉴' };

function indirectSourceLabels(sources) {
  if (!Array.isArray(sources)) return [];
  return [...new Set(sources.filter(s => s !== '직접').map(s => SOURCE_LABELS[s] || s))];
}

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
  const indirectLabels = indirectSourceLabels(menu.sources);

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
      {indirectLabels.length > 0 && (
        <span
          title={`${indirectLabels.join(', ')}에서 연결됨`}
          style={{
            fontSize: 10,
            fontWeight: 500,
            opacity: 0.75,
            padding: '0 4px',
            borderRadius: 99,
            background: 'rgba(0,0,0,0.08)',
          }}
        >
          {indirectLabels.join('·')}
        </span>
      )}
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
