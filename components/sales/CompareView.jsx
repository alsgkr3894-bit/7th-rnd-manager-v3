'use client';
import { CompareSummary } from './CompareSummary';
import { TopMovers } from './TopMovers';
import { CompareTable } from './CompareTable';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export function CompareView({ categories, category, onCategoryChange, compare, movers }) {
  const safeCategories = asStringArray(categories);
  const safeCategory = asDisplayText(category);
  const safeCompare =
    compare && typeof compare === 'object' && !Array.isArray(compare)
      ? { ...compare, rows: asObjectArray(compare.rows) }
      : null;
  const safeMovers = movers && typeof movers === 'object' && !Array.isArray(movers) ? movers : {};
  const handleCategoryChange = typeof onCategoryChange === 'function' ? onCategoryChange : () => {};

  return (
    <>
      <div className="filter-chip-row">
        {safeCategories.map(c => {
          const isActive = c === '전체' ? !safeCategory : safeCategory === c;
          return (
            <button
              key={c}
              onClick={() => handleCategoryChange(c === '전체' ? null : c)}
              className={'filter-chip' + (isActive ? ' active' : '')}
            >
              {c}
            </button>
          );
        })}
      </div>

      {safeCompare && <CompareSummary compare={safeCompare} />}

      <TopMovers topRise={safeMovers.topRise} topFall={safeMovers.topFall} />

      {safeCompare && <CompareTable rows={safeCompare.rows} />}
    </>
  );
}
