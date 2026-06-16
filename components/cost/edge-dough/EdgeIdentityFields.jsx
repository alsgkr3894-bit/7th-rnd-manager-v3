'use client';
import { FieldLabel } from '@/components/cost/shared/FormLabels';
import { EDGE_TYPES } from '@/lib/cost/edge-dough';

export function EdgeIdentityFields({ edgeType, size, isNew, onEdgeTypeChange, onSizeChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <FieldLabel>엣지 유형</FieldLabel>
        <select
          className="form-input"
          value={edgeType}
          onChange={e => onEdgeTypeChange(e.target.value)}
          disabled={!isNew}
        >
          {EDGE_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>규격</FieldLabel>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '9px 0' }}>
          {(edgeType === '씬도우' ? ['L'] : ['L', 'R']).map(nextSize => (
            <label
              key={nextSize}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: isNew ? 'pointer' : 'default',
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                value={nextSize}
                checked={size === nextSize}
                onChange={() => onSizeChange(nextSize)}
                disabled={!isNew}
                style={{ accentColor: 'var(--accent)' }}
              />
              {nextSize}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
