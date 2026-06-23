'use client';
import { defaultMarginSuffix } from '@/lib/cost/edge-dough';

export function EdgeMarginSettings({
  edgeType,
  expandInMargin,
  marginSuffix,
  onExpandChange,
  onSuffixChange,
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--surface-2)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <input
          type="checkbox"
          checked={expandInMargin}
          onChange={e => onExpandChange(e.target.checked)}
          style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
        />
        원가마진표에 별도 행으로 표시
      </label>
      {expandInMargin && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          코드 접미사
          <input
            className="form-input"
            value={marginSuffix}
            onChange={e => onSuffixChange(e.target.value)}
            placeholder={defaultMarginSuffix(edgeType)}
            style={{ width: 64, textAlign: 'center' }}
          />
        </label>
      )}
    </div>
  );
}
