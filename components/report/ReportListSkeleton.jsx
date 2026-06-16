'use client';

export function ReportListSkeleton() {
  return (
    <div
      className="card"
      style={{
        padding: 'clamp(16px, 4vw, 24px) clamp(16px, 5vw, 28px)',
        overflow: 'hidden',
      }}
    >
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <div
            className="skeleton"
            style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
          />
          <div className="skeleton skeleton-text" style={{ flex: '0 1 80px', maxWidth: '100%' }} />
          <div className="skeleton skeleton-text" style={{ flex: '1 1 160px', minWidth: 0 }} />
          <div className="skeleton skeleton-text" style={{ flex: '0 1 60px', maxWidth: '100%' }} />
          <div className="skeleton skeleton-text" style={{ flex: '0 1 100px', maxWidth: '100%' }} />
          <div className="skeleton skeleton-text" style={{ flex: '0 1 120px', maxWidth: '100%' }} />
        </div>
      ))}
    </div>
  );
}
