'use client';
import { NOTE_STATUS } from '@/lib/note/constants';

export function NoteStatsSummary({ stats, counts }) {
  if (!stats) return null;

  const safeCounts = counts && typeof counts === 'object' ? counts : {};

  return (
    <div className="stat-row" style={{ marginTop: 8 }}>
      <div className="stat-card">
        <div className="stat-label">전체 노트</div>
        <div className="stat-value">
          {stats.total}
          <span className="unit">개</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">이번 달 작성</div>
        <div className="stat-value">
          {stats.thisMonth}
          <span className="unit">개</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">보고예정</div>
        <div className="stat-value" style={{ color: 'var(--color-reporting)' }}>
          {safeCounts[NOTE_STATUS.REPORTING] || 0}
          <span className="unit">개</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">출시 전환율</div>
        <div className="stat-value" style={{ color: 'var(--positive)' }}>
          {stats.releaseRate}
          <span className="unit">%</span>
        </div>
      </div>
      {stats.monthly && (
        <div className="stat-card" style={{ flex: '2 1 200px' }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>
            최근 6개월
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
            {stats.monthly.map(month => {
              const max = Math.max(...stats.monthly.map(item => item.count), 1);
              const height = Math.max(4, Math.round((month.count / max) * 36));
              return (
                <div
                  key={month.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height,
                      borderRadius: 3,
                      background: month.count ? 'var(--accent)' : 'var(--border)',
                      opacity: month.count ? 1 : 0.4,
                    }}
                  />
                  <span style={{ fontSize: 9, color: 'var(--text-4)' }}>{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
