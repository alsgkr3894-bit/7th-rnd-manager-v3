'use client';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { keyOf } from './usage-display-utils';
import { IngredientUsageEmptyState } from './table/IngredientUsageEmptyState';
import { IngredientUsageTableFooter } from './table/IngredientUsageTableFooter';
import { IngredientUsageTableHeader } from './table/IngredientUsageTableHeader';
import { IngredientUsageTableRow } from './table/IngredientUsageTableRow';

const PAGE_SIZE = 80;

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
  const { page, goTo, totalPages, paged, total } = usePagination(displayRows, PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  return (
    <div className="card table-card">
      {displayRows.length === 0 ? (
        <IngredientUsageEmptyState showHidden={showHidden} showUnused={showUnused} />
      ) : (
        <table className="data-table">
          <IngredientUsageTableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <tbody>
            {paged.map((row, i) => {
              const idx = startIndex + i;
              return (
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
              );
            })}
          </tbody>
        </table>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={goTo}
        total={total}
        pageSize={PAGE_SIZE}
      />
      <IngredientUsageTableFooter
        displayCount={displayRows.length}
        hiddenCount={hiddenCount}
        showUnused={showUnused}
        usageCat={usageCat}
      />
    </div>
  );
}
