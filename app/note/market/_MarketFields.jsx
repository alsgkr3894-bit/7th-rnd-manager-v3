'use client';

/** 시장조사 작성 폼·상세 모달이 함께 쓰는 라벨 필드 primitive. */
export function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

export function DetailField({ label, value }) {
  if (!String(value || '').trim()) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}
      >
        {value}
      </div>
    </div>
  );
}
