'use client';
import { formatNumber } from '@/lib/format';

/**
 * UnmatchedSummary — 미매칭 페이지 상단 KPI 3카드
 */
export function UnmatchedSummary({ openCount, resolvedCount, months }) {
  return (
    <div className="hero-row" style={{marginTop:16}}>
      <SummaryCard
        label="미해결 미매칭"
        value={openCount}
        color="var(--negative)"
        sub={openCount === 0 ? '모든 메뉴가 매핑됐어요' : '처리 필요'}
      />
      <SummaryCard
        label="해결된 미매칭"
        value={resolvedCount}
        color="var(--positive)"
        sub="별칭·룰·제외로 처리됨"
      />
      <SummaryCard
        label="업로드된 월 수"
        value={months.length}
        color="var(--accent)"
        sub={months.length === 0
          ? '아직 업로드 없음'
          : `${months[0]?.year}년 ${months[0]?.month}월 ~`}
      />
    </div>
  );
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num" style={{color}}>
          {formatNumber(value)}<span className="unit">건</span>
        </div>
        <div className="trend"><span style={{color:'var(--text-3)'}}>{sub}</span></div>
      </div>
    </div>
  );
}
