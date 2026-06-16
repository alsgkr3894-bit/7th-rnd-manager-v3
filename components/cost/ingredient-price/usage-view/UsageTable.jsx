'use client';

import { Fragment } from 'react';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';
import {
  getUsageTier,
  shouldShowUsageTier,
  TIER_LABELS,
  USAGE_CAT_COLORS,
  USAGE_MENU_PREVIEW_LIMIT,
  usageCountBadgeStyle,
} from './usageViewUtils';

function UsageTierRow({ row }) {
  return (
    <tr>
      <td
        colSpan={6}
        style={{
          padding: '7px 12px',
          background: 'var(--surface-2)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-3)',
          borderTop: '1px solid var(--divider)',
        }}
      >
        {TIER_LABELS[getUsageTier(row.count)]}
      </td>
    </tr>
  );
}

function UsageScopeBadge({ scope }) {
  if (!scope) return null;
  const style = SCOPE_STYLES[scope];

  return (
    <span
      style={{
        marginLeft: 6,
        fontSize: 10,
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 8,
        color: style?.color || 'var(--text-3)',
        background: style?.bg || 'var(--surface-2)',
        whiteSpace: 'nowrap',
      }}
    >
      {scope}
    </span>
  );
}

function UsageCountBadge({ count }) {
  const style = usageCountBadgeStyle(count);

  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 32,
        padding: '2px 8px',
        borderRadius: 99,
        fontWeight: 700,
        fontSize: 13,
        ...style,
      }}
    >
      {count}
    </span>
  );
}

function UsagePizzaSideCounts({ row }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'stretch',
        minWidth: 76,
        fontSize: 11,
        color: 'var(--text-3)',
      }}
    >
      <span>
        피자 <b style={{ color: 'var(--text-1)' }}>{row.pizzaCount || 0}</b>
      </span>
      <span>
        사이드 <b style={{ color: 'var(--text-1)' }}>{row.sideCount || 0}</b>
      </span>
    </div>
  );
}

function UsageMenuChip({ menu }) {
  const colors = USAGE_CAT_COLORS[menu.cat] || {
    bg: 'var(--surface-2)',
    color: 'var(--text-3)',
  };

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 99,
        background: colors.bg,
        color: colors.color,
        whiteSpace: 'nowrap',
      }}
    >
      {menu.menuName}
    </span>
  );
}

function UsageMenuList({ row, open, onToggle }) {
  const visible = open ? row.menus : row.menus.slice(0, USAGE_MENU_PREVIEW_LIMIT);
  const more = row.menus.length - USAGE_MENU_PREVIEW_LIMIT;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {visible.map(menu => (
        <UsageMenuChip key={menu.menuName} menu={menu} />
      ))}
      {!open && more > 0 && (
        <button
          onClick={() => onToggle(row.uid)}
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
      {open && row.menus.length > USAGE_MENU_PREVIEW_LIMIT && (
        <button
          onClick={() => onToggle(row.uid)}
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

function UsageIngredientRow({ row, index, open, onToggle }) {
  return (
    <tr>
      <td style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>{index + 1}</td>
      <td style={{ fontWeight: 600, fontSize: 13 }}>
        {row.name}
        <UsageScopeBadge scope={row.scope} />
      </td>
      <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
        {row.code || '—'}
      </td>
      <td style={{ textAlign: 'center' }}>
        <UsageCountBadge count={row.count} />
      </td>
      <td style={{ textAlign: 'center' }}>
        <UsagePizzaSideCounts row={row} />
      </td>
      <td>
        <UsageMenuList row={row} open={open} onToggle={onToggle} />
      </td>
    </tr>
  );
}

function UsageEmptyState() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      등록된 레시피가 없거나 해당 카테고리에 사용된 재료가 없습니다
    </div>
  );
}

function UsageTableFooter({ count, usageCat }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        fontSize: 11,
        color: 'var(--text-3)',
        borderTop: '1px solid var(--divider)',
      }}
    >
      {count}개 식자재 표시 · {usageCat !== '전체' ? `${usageCat} 필터 중` : '전체 카테고리'}
    </div>
  );
}

export function UsageTable({ rows, expanded, usageSort, usageCat, onToggle }) {
  return (
    <div className="card table-card">
      {rows.length === 0 ? (
        <UsageEmptyState />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>순위</th>
              <th>식자재명</th>
              <th style={{ width: 80 }}>제품코드</th>
              <th style={{ width: 90, textAlign: 'center' }}>사용 메뉴수</th>
              <th style={{ width: 112, textAlign: 'center' }}>피자/사이드</th>
              <th>메뉴 목록</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={row.uid}>
                {shouldShowUsageTier({ rows, index, usageSort }) && <UsageTierRow row={row} />}
                <UsageIngredientRow
                  row={row}
                  index={index}
                  open={expanded.has(row.uid)}
                  onToggle={onToggle}
                />
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      <UsageTableFooter count={rows.length} usageCat={usageCat} />
    </div>
  );
}
