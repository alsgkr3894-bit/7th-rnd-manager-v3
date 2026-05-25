'use client';
import { CompareSummary } from './CompareSummary';
import { TopMovers } from './TopMovers';
import { CompareTable } from './CompareTable';

/**
 * CompareView — 두 기간 비교 모드 전체 UI (전월/전년 동월/사용자 지정)
 *
 * @param {Array} categories — 카테고리 chip 후보 (['전체', '피자', ...])
 * @param {string|null} category — 선택된 카테고리 ('전체'는 null)
 * @param {(c) => void} onCategoryChange
 * @param {object} compare — buildPeriodCompare 결과
 * @param {{topRise, topFall}} movers — 피자·사이드·1인피자 한정 상승/하락
 */
export function CompareView({ categories, category, onCategoryChange, compare, movers }) {
  return (
    <>
      <div style={{display:'flex', gap:6, marginTop:16, flexWrap:'wrap'}}>
        {categories.map(c => {
          const isActive = (c === '전체' ? !category : category === c);
          return (
            <button
              key={c}
              onClick={() => onCategoryChange(c === '전체' ? null : c)}
              className="chip"
              style={{
                cursor:'pointer', border:'none',
                background: isActive ? 'var(--accent)' : 'var(--surface-2)',
                color: isActive ? '#fff' : 'var(--text-2)',
                fontWeight: 600,
              }}
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
