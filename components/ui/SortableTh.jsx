'use client';
import {
  getSortIndicator,
  normalizeSortChangeHandler,
  normalizeSortValue,
  normalizeSortableStyle,
  normalizeSortableWidth,
  normalizeTableSpan,
} from '@/lib/ui/sort-controls';

/**
 * SortableTh — 클릭으로 정렬 가능한 테이블 헤더
 *
 * @param {string}   sortKey   - 이 헤더의 정렬 키
 * @param {string}   active    - 현재 활성 정렬 키
 * @param {string}   dir       - 'asc' | 'desc'
 * @param {Function} onClick   - onClick(sortKey)
 * @param {number}   [width]
 * @param {boolean}  [right]   - 오른쪽 정렬
 * @param {object}   [style]   - 추가 인라인 스타일 (병합)
 * @param {string}   [className] - 추가 클래스
 * @param {ReactNode} children - 헤더 라벨
 */
export function SortableTh({
  sortKey,
  active,
  dir,
  onClick,
  children,
  width,
  right,
  style,
  className,
  rowSpan,
  colSpan,
}) {
  const safeSortKey = normalizeSortValue(sortKey);
  const indicator = getSortIndicator(safeSortKey, active, dir);
  const handleClick = normalizeSortChangeHandler(onClick);
  const safeClassName = normalizeSortValue(className);
  const safeWidth = normalizeSortableWidth(width);
  const safeStyle = normalizeSortableStyle(style);
  const safeRowSpan = normalizeTableSpan(rowSpan);
  const safeColSpan = normalizeTableSpan(colSpan);

  return (
    <th
      onClick={() => handleClick(safeSortKey)}
      rowSpan={safeRowSpan}
      colSpan={safeColSpan}
      className={safeClassName ? `sortable ${safeClassName}` : 'sortable'}
      style={{
        width: safeWidth,
        textAlign: right ? 'right' : undefined,
        cursor: 'pointer',
        userSelect: 'none',
        ...safeStyle,
      }}
    >
      {children}{' '}
      <span style={{ color: indicator.active ? 'var(--accent)' : 'var(--text-4)', fontSize: 10 }}>
        {indicator.symbol}
      </span>
    </th>
  );
}
