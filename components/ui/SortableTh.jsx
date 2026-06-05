'use client';

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
export function SortableTh({ sortKey, active, dir, onClick, children, width, right, style, className, rowSpan, colSpan }) {
  const isActive = active === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={className ? `sortable ${className}` : 'sortable'}
      style={{ width, textAlign: right ? 'right' : undefined, cursor:'pointer', userSelect:'none', ...style }}
    >
      {children}{' '}
      <span style={{color: isActive ? 'var(--accent)' : 'var(--text-4)', fontSize: 10}}>
        {isActive ? (dir === 'asc' ? '▲' : '▼') : '▾'}
      </span>
    </th>
  );
}
