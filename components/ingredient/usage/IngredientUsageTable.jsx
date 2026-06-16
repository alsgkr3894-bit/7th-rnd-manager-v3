'use client';
import { keyOf } from './usage-display-utils';
import { IngredientUsageEmptyState } from './table/IngredientUsageEmptyState';
import { IngredientUsageTableFooter } from './table/IngredientUsageTableFooter';
import { IngredientUsageTableHeader } from './table/IngredientUsageTableHeader';
import { IngredientUsageTableRow } from './table/IngredientUsageTableRow';

export function IngredientUsageTable({
  displayRows,
  hidden,
  hiddenCount,
  showHidden,
  showUnused,
  usageCat,
  byCount,
  sortKey,
  sortDir,
  expanded,
  onSort,
  onToggleRow,
  onToggleHidden,
  onExcludeMenu,
}) {
  return (
    <div className="card table-card">
      {displayRows.length === 0 ? (
        <IngredientUsageEmptyState showHidden={showHidden} showUnused={showUnused} />
      ) : (
        <table className="data-table">
          <IngredientUsageTableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <tbody>
            {displayRows.map((row, idx) => (
              <IngredientUsageTableRow
                key={`${keyOf(row)}-${idx}`}
                row={row}
                idx={idx}
                previousRow={displayRows[idx - 1]}
                byCount={byCount}
                hidden={hidden}
                expanded={expanded}
                onToggleRow={onToggleRow}
                onToggleHidden={onToggleHidden}
                onExcludeMenu={onExcludeMenu}
              />
            ))}
          </tbody>
        </table>
      )}
      <IngredientUsageTableFooter
        displayCount={displayRows.length}
        hiddenCount={hiddenCount}
        showUnused={showUnused}
        usageCat={usageCat}
      />
    </div>
  );
}
