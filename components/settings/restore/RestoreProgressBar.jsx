import { formatNumber } from '@/lib/format';

export function restoreProgressPercent(progress) {
  if (!progress) return 0;
  return Math.max(6, Math.min(100, (progress.current / Math.max(progress.total, 1)) * 100));
}

export function RestoreProgressBar({ progress }) {
  if (!progress) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
          color: 'var(--text-2)',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700 }}>{progress.label}</span>
        <span className="num">
          {formatNumber(Math.min(progress.current, progress.total))} / {formatNumber(progress.total)}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--surface-3)',
        }}
      >
        <div
          style={{
            width: `${restoreProgressPercent(progress)}%`,
            height: '100%',
            background: 'var(--negative)',
            transition: 'width 180ms ease',
          }}
        />
      </div>
    </div>
  );
}
