'use client';
import { CompareSummary } from './CompareSummary';
import { TopMovers } from './TopMovers';
import { CompareTable } from './CompareTable';

export function CompareView({ categories, category, onCategoryChange, compare, movers }) {
  return (
    <>
      <div className="filter-chip-row">
        {categories.map(c => {
          const isActive = c === '전체' ? !category : category === c;
          return (
            <button
              key={c}
              onClick={() => onCategoryChange(c === '전체' ? null : c)}
              className={'filter-chip' + (isActive ? ' active' : '')}
            >
              {c}
            </button>
          );
        })}
      </div>

      {compare && <CompareSummary compare={compare} />}

      <TopMovers topRise={movers.topRise} topFall={movers.topFall} />

      {compare && <CompareTable rows={compare.rows} />}
    </>
  );
}
