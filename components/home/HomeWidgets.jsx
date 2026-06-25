'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { formatNumber } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline } from '@/components/charts/Sparkline';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

// 정식 위치는 @/components/ui/EmptyState — 기존 import 경로 호환을 위해 재export
export { EmptyState };
export { CostAlertWidget } from '@/components/home/CostAlertWidget';
export { QuickReportWidget } from '@/components/home/QuickReportWidget';
export { SampleStatsWidget } from '@/components/home/SampleStatsWidget';

export const rowButtonStyle = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  font: 'inherit',
  width: '100%',
  cursor: 'pointer',
};

export function SkeletonChart() {
  return (
    <div
      style={{
        height: 180,
        background: 'linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2))',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        borderRadius: 8,
      }}
    />
  );
}

export function RankCard({ title, sub, items, emptyTitle, accent, router }) {
  const safeItems = asObjectArray(items);
  const safeTitle = asDisplayText(title);
  const safeSub = asDisplayText(sub);
  const safeEmptyTitle = asDisplayText(emptyTitle, '표시할 데이터가 없어요');

  return (
    <div className="card tx-card">
      <div className="card-header">
        <div>
          <div className="card-title">{safeTitle}</div>
          <div className="card-sub">{safeSub}</div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/menu-sales/rank-compare')}>
          전체 →
        </button>
      </div>
      {safeItems.length === 0 ? (
        <EmptyState
          icon={<Icon.chart style={{ width: 32, height: 32 }} />}
          title={safeEmptyTitle}
          desc="판매량 업로드 후 표시됩니다"
          compact
        />
      ) : (
        <div className="rank-list">
          {safeItems.map((r, index) => {
            const name = asDisplayText(r.name);
            const rank = asDisplayText(r.rank, String(index + 1));
            const spark = Array.isArray(r.spark) ? r.spark : [];
            return (
              <button
                key={r.rank ?? (name || index)}
                className="rank-row"
                onClick={() =>
                  router?.push?.(`/menu-sales/rank-compare?menu=${encodeURIComponent(name)}`)
                }
                style={rowButtonStyle}
              >
                <div className={`rank-num num ${accent}`}>{rank}</div>
                <div className="rank-name">{name}</div>
                {spark.some(v => Number(v) > 0) && (
                  <div className="rank-mini">
                    <Sparkline
                      data={spark}
                      fill={false}
                      width={56}
                      height={22}
                      color={accent === 'down' ? 'var(--negative)' : 'var(--positive)'}
                    />
                  </div>
                )}
                {r.quantity != null && <div className="rank-val">{formatNumber(r.quantity)}</div>}
                <Icon.chevRight className="chev" style={{ width: 16, height: 16 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportingNotesWidget({ notes, router }) {
  const safeNotes = asObjectArray(notes);
  if (safeNotes.length === 0) return null;
  const sc = STATUS_COLORS['출시예정'];
  const sb = STATUS_BORDER['출시예정'];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">출시예정 노트</div>
          <div className="card-sub">{safeNotes.length}개 대기 중</div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/note')}>
          전체 →
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {safeNotes.slice(0, 5).map((n, index) => {
          const href = n.id == null ? null : `/note/${n.id}`;
          const title = asDisplayText(n.title || n.menuName, '제목 없음');
          const menuName = asDisplayText(n.menuName);
          return (
            <div
              key={n.id ?? index}
              className="widget-row"
              role="button"
              tabIndex={0}
              onClick={() => href && router?.push?.(href)}
              onKeyDown={e => e.key === 'Enter' && href && router?.push?.(href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                borderLeft: `3px solid ${sb}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  title={title}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{menuName}</div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  flexShrink: 0,
                  background: sc.bg,
                  color: sc.color,
                }}
              >
                출시예정
              </span>
            </div>
          );
        })}
        {safeNotes.length > 5 && (
          <div
            style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}
          >
            외 {safeNotes.length - 5}개
          </div>
        )}
      </div>
    </div>
  );
}
