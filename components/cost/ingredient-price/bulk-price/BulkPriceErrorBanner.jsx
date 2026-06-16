'use client';

export function BulkPriceErrorBanner({ error }) {
  if (!error) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--negative, #ef4444) 10%, transparent)',
        color: 'var(--negative, #ef4444)',
        fontSize: 13,
      }}
    >
      {error}
    </div>
  );
}
