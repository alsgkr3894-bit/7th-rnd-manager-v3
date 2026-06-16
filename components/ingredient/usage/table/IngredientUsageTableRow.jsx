import { Fragment } from 'react';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';
import { TIER_LABEL, keyOf, tierOf, usageCountStyle } from '../usage-display-utils';
import { IngredientNameCell } from './IngredientNameCell';
import { MenuTypeCounts } from './MenuTypeCounts';
import { UsageMenuChips } from './UsageMenuChips';

const VISIBLE_MENU_COUNT = 4;

export function IngredientUsageTableRow({
  row,
  idx,
  previousRow,
  byCount,
  hidden,
  expanded,
  onToggleRow,
  onToggleHidden,
  onExcludeMenu,
}) {
  const key = keyOf(row);
  const open = expanded.has(key);
  const visibleMenus = open ? row.menus : row.menus.slice(0, VISIBLE_MENU_COUNT);
  const more = row.menus.length - VISIBLE_MENU_COUNT;
  const tier = tierOf(row.count);
  const showTier = byCount && (idx === 0 || tierOf(previousRow.count) !== tier);
  const scopeStyle = row.scope ? SCOPE_STYLES[row.scope] : null;
  const isHidden = hidden.has(key);

  return (
    <Fragment>
      {showTier && <UsageTierRow tier={tier} />}
      <tr style={isHidden ? { opacity: 0.55 } : undefined}>
        <td style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>{idx + 1}</td>
        <td>
          <IngredientNameCell row={row} scopeStyle={scopeStyle} />
        </td>
        <td style={{ textAlign: 'center' }}>
          <UsageCountBadge count={row.count} />
        </td>
        <td style={{ textAlign: 'center' }}>
          <MenuTypeCounts row={row} />
        </td>
        <td>
          <UsageMenuChips
            row={row}
            open={open}
            more={more}
            visibleMenus={visibleMenus}
            visibleCount={VISIBLE_MENU_COUNT}
            rowKey={key}
            onToggleRow={onToggleRow}
            onExcludeMenu={onExcludeMenu}
          />
        </td>
        <td style={{ textAlign: 'center' }}>
          <button
            className="btn sm"
            style={{
              fontSize: 10,
              padding: '2px 6px',
              color: isHidden ? 'var(--accent)' : 'var(--text-3)',
            }}
            title={isHidden ? '표시' : '숨김(목록·출력 제외)'}
            onClick={() => onToggleHidden(key)}
          >
            {isHidden ? '표시' : '숨김'}
          </button>
        </td>
      </tr>
    </Fragment>
  );
}

function UsageTierRow({ tier }) {
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
        {TIER_LABEL[tier]}
      </td>
    </tr>
  );
}

function UsageCountBadge({ count }) {
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 32,
        padding: '2px 8px',
        borderRadius: 99,
        fontWeight: 700,
        fontSize: 13,
        ...usageCountStyle(count),
      }}
    >
      {count}
    </span>
  );
}
