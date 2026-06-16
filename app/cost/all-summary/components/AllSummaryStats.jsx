import { costRateColor } from '@/lib/cost/rate-color';

export function AllSummaryStats({ stats }) {
  return (
    <div className="stat-row" style={{ marginTop: 8 }}>
      <AllSummaryStatCard label="등록 메뉴 수" value={stats.total} unit="개" />
      <AllSummaryStatCard label="레시피 등록" value={stats.withCost} unit="건" />
      <AllSummaryStatCard
        label="평균 원가율"
        value={stats.avgRate != null ? stats.avgRate.toFixed(1) : '—'}
        unit="%"
        color={stats.avgRate != null ? costRateColor(stats.avgRate) : undefined}
      />
      <AllSummaryStatCard
        label="원가율 경보 (40% 초과)"
        value={stats.alertCnt}
        unit="개"
        color={stats.alertCnt > 0 ? 'var(--negative)' : undefined}
      />
    </div>
  );
}

function AllSummaryStatCard({ label, value, unit, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>
        {value}
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}
