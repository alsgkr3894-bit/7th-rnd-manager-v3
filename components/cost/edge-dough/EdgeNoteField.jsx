'use client';
import { FieldLabel } from '@/components/cost/shared/FormLabels';

export function EdgeNoteField({ value, onChange }) {
  return (
    <div>
      <FieldLabel>비고</FieldLabel>
      <input
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="선택 입력"
      />
    </div>
  );
}
