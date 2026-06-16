'use client';

import { asDisplayText } from '@/lib/ui/prop-guards';

export function ReportPreviewOptionRow({ label, value }) {
  const safeLabel = asDisplayText(label);
  const safeValue = asDisplayText(value, '—');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{safeLabel}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{safeValue}</span>
    </div>
  );
}
