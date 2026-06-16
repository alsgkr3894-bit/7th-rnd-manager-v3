'use client';

import { FieldLabel } from '@/components/cost/shared/FormLabels';

export function GroupEditorBasicFields({ draft, onField }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px 20px',
        marginBottom: 20,
      }}
    >
      <div>
        <FieldLabel>묶음 이름 *</FieldLabel>
        <input
          className="form-input"
          value={draft.name}
          onChange={event => onField('name', event.target.value)}
          placeholder="예) 피자L 공통, 피자LR 공통"
        />
      </div>
      <div>
        <FieldLabel>설명 (선택)</FieldLabel>
        <input
          className="form-input"
          value={draft.description || ''}
          onChange={event => onField('description', event.target.value)}
          placeholder="묶음 설명"
        />
      </div>
    </div>
  );
}
