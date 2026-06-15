'use client';

import { useCountUp } from '@/hooks/useCountUp';

export function ReportStatsRow({ stats, monthLabel, onOpenSchedule }) {
  const total = useCountUp(stats.total, { duration: 900 });
  const thisMonth = useCountUp(stats.thisMonth, { duration: 900, delay: 80 });
  const sharedLinks = useCountUp(stats.sharedLinks, { duration: 900, delay: 160 });

  return (
    <div className="stat-row motion-stagger">
      <div className="stat-card">
        <div className="stat-label">전체 보고서</div>
        <div className="stat-value num">
          {total}
          <span className="unit">건</span>
        </div>
        <div className="stat-foot">전체 기간</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">이번 달 생성</div>
        <div className="stat-value num" style={{ color: 'var(--accent-text)' }}>
          {thisMonth}
          <span className="unit">건</span>
        </div>
        <div className="stat-foot">{monthLabel} 기준</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">자동 예약</div>
        <div className="stat-value num">
          {stats.auto}
          <span className="unit">건</span>
        </div>
        <div className="stat-foot">
          <button className="link" onClick={onOpenSchedule}>
            예약 관리 →
          </button>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">활성 공유 링크</div>
        <div className="stat-value num" style={{ color: '#6B3FCB' }}>
          {sharedLinks}
          <span className="unit">개</span>
        </div>
        <div className="stat-foot">
          {stats.sharedLinks === 0 ? '활성 링크 없음' : `${stats.sharedLinks}개 활성`}
        </div>
      </div>
    </div>
  );
}
