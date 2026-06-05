'use client';

/**
 * FilterChip — 필터 옵션을 chip 버튼 그룹으로 렌더.
 *
 * @param {{
 *   value: string,
 *   options: Array<{ id: string, label: string, count?: number, style?: object }>,
 *   onChange: (id: string) => void,
 *   label?: string,
 * }} props
 */
export function FilterChip({ value, options, onChange, label }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {label && (
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 2 }}>
          {label}
        </span>
      )}
      {options.map(opt => (
        <button
          key={opt.id}
          className={'chip' + (value === opt.id ? ' active' : '')}
          style={value !== opt.id ? opt.style : undefined}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
          {opt.count != null && (
            <span style={{ marginLeft: 4, opacity: 0.75 }}>{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
