'use client';

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
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          className={'chip' + (value === opt.id ? ' active' : '')}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
