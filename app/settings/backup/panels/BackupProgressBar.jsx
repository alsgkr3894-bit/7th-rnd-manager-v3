'use client';

export function BackupProgressBar({ backupProgress }) {
  if (!backupProgress) return null;
  return (
    <div className="card" style={{ marginTop: 16, padding: '14px 18px' }} aria-live="polite">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700 }}>{backupProgress.label}</span>
        <span className="num" style={{ color: 'var(--text-3)' }}>
          {backupProgress.current} / {backupProgress.total}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.round((backupProgress.current / Math.max(backupProgress.total, 1)) * 100))}%`,
            height: '100%',
            background: 'var(--accent)',
            transition: 'width .15s ease',
          }}
        />
      </div>
    </div>
  );
}
