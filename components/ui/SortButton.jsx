'use client';
import {
  getSortButtonClassName,
  normalizeSortChangeHandler,
  normalizeSortOptions,
  normalizeSortValue,
} from '@/lib/ui/sort-controls';

/**
 * SortButton — 정렬 옵션을 chip 스타일 버튼 그룹으로 렌더.
 *
 * @param {{
 *   value: string,
 *   options: Array<{ id: string, label: string }>,
 *   onChange: (id: string) => void,
 * }} props
 */
export function SortButton({ value, options, onChange }) {
  const safeValue = normalizeSortValue(value);
  const notifyChange = normalizeSortChangeHandler(onChange);
  const safeOptions = normalizeSortOptions(options);

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {safeOptions.map(opt => (
        <button
          key={opt.key}
          className={getSortButtonClassName(opt.id, safeValue)}
          onClick={() => notifyChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
