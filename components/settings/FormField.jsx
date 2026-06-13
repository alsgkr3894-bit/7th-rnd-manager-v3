'use client';

/** 설정 폼 공용 라벨 필드 (label + 필수 표시 + children). */
export function FormField({ label, required, children }) {
  return (
    <div>
      <label
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
      {children}
    </div>
  );
}
