'use client';
import { Children, cloneElement, isValidElement, useId } from 'react';

/** 설정 폼 공용 라벨 필드 (label + 필수 표시 + children). */
export function FormField({ label, required, children, id }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const labeledChildren = Children.map(children, child => {
    if (!isValidElement(child)) return child;
    if (child.props.id) return child;
    if (!['input', 'select', 'textarea'].includes(child.type)) return child;
    return cloneElement(child, { id: fieldId });
  });

  return (
    <div>
      <label
        htmlFor={fieldId}
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--text-3)',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 3 }}>*</span>}
      </label>
      {labeledChildren}
    </div>
  );
}
