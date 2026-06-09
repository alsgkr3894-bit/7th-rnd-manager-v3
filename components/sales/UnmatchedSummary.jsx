'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * UnmatchedSummary — 미매칭 페이지 상단 KPI 3카드
 */
export function UnmatchedSummary({ openCount, resolvedCount, months }) {
  const safeMonths = asObjectArray(months);
  const safeOpenCount = Number.isFinite(Number(openCount)) ? Number(openCount) : 0;
  const safeResolvedCount = Number.isFinite(Number(resolvedCount)) ? Number(resolvedCount) : 0;
  const latestMonth = safeMonths[0] || {};
  const latestMonthLabel = `${asDisplayText(latestMonth.year, '-')}년 ${asDisplayText(latestMonth.month, '-')}월 ~`;

  return (
    <div className="hero-row" style={{ marginTop: 16 }}>
      <SummaryCard
        label="미해결 미매칭"
        value={safeOpenCount}
        color="var(--negative)"
        sub={safeOpenCount === 0 ? '모든 메뉴가 매핑됐어요' : '처리 필요'}
      />
      <SummaryCard
        label="해결된 미매칭"
        value={safeResolvedCount}
        color="var(--positive)"
        sub="별칭·룰·제외로 처리됨"
      />
      <SummaryCard
        label="업로드된 월 수"
        value={safeMonths.length}
        color="var(--accent)"
        sub={safeMonths.length === 0 ? '아직 업로드 없음' : latestMonthLabel}
      />
    </div>
  );
}

function SummaryCard({ label, value, color, sub }) {
  const safeLabel = asDisplayText(label);
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const safeColor = asDisplayText(color, 'var(--text-1)');
  const safeSub = asDisplayText(sub);

  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{safeLabel}</div>
        <div className="value num" style={{ color: safeColor }}>
          {formatNumber(safeValue)}
          <span className="unit">건</span>
        </div>
        <div className="trend">
          <span style={{ color: 'var(--text-3)' }}>{safeSub}</span>
        </div>
      </div>
    </div>
  );
}
