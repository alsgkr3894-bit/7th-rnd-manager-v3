'use client';
import { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { formatNumber, formatPercent } from '@/lib/format';
import { Sparkline } from '@/components/charts/Sparkline';
import { normalizeNumberSeries } from '@/lib/ui/chart-data';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { MomBars } from './MomBars';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';

const kpiButtonStyle = {
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  width: '100%',
};

export const HomeKpiRow = memo(function HomeKpiRow({
  salesKpi,
  costKpi,
  noteKpi,
  salesCount,
  noteCount,
}) {
  const router = useRouter();
  const isMain = useIsMainBrand(); // 평균 원가율 '피자 카테고리' 배지는 7번가만
  const [salesPopped, setSalesPopped] = useState(false);
  const [notePopped, setNotePopped] = useState(false);
  const salesSparkline = normalizeNumberSeries(salesKpi?.sparkline);
  const costSparkline = normalizeNumberSeries(costKpi?.sparkline);
  const noteSparkline = normalizeNumberSeries(noteKpi?.sparkline);
  const safeSalesCount = Number.isFinite(Number(salesCount)) ? Number(salesCount) : 0;
  const safeNoteCount = Number.isFinite(Number(noteCount)) ? Number(noteCount) : 0;
  const rawCostRate = Number(costKpi?.rate);
  const safeCostRate = Number.isFinite(rawCostRate) ? rawCostRate : null;
  const salesYear = asDisplayText(salesKpi?.year);
  const salesMonthNumber = Number(salesKpi?.month);
  const hasSalesPeriod =
    salesYear &&
    Number.isInteger(salesMonthNumber) &&
    salesMonthNumber >= 1 &&
    salesMonthNumber <= 12;
  const deltaPct = Number(salesKpi?.deltaPct);
  const hasDeltaPct = salesKpi?.deltaPct != null && Number.isFinite(deltaPct);
  const reportingCount = Number(noteKpi?.reporting);
  const safeReportingCount = Number.isFinite(reportingCount) ? Math.max(0, reportingCount) : 0;

  // 월 비교 미니 막대 (최근 6개월) — 판매 sparkline + 파생 월 라벨
  const momSeries = salesSparkline.slice(-6);
  const momLabels = hasSalesPeriod
    ? Array.from({ length: 6 }, (_, i) => {
        let m = salesMonthNumber - (5 - i);
        while (m < 1) m += 12;
        return `${m}월`;
      })
    : [];

  useEffect(() => {
    if (safeSalesCount > 0 && !salesPopped) {
      setSalesPopped(true);
    }
  }, [safeSalesCount, salesPopped]);

  useEffect(() => {
    if (safeNoteCount > 0 && !notePopped) {
      setNotePopped(true);
    }
  }, [safeNoteCount, notePopped]);

  return (
    <div className="hero-row motion-stagger">
      <button
        className="card kpi-card kpi-clickable"
        onClick={() => router?.push?.('/menu-sales/rank-compare')}
        style={kpiButtonStyle}
      >
        <div>
          <div className="label">
            {hasSalesPeriod ? `${salesYear}년 ${salesMonthNumber}월 판매량` : '최근 판매량'}
          </div>
          <div className={salesPopped ? 'value num count-landed' : 'value num'}>
            {formatNumber(safeSalesCount)}
            <span className="unit">개</span>
          </div>
          <div className="trend">
            {!hasDeltaPct ? (
              <span style={{ color: 'var(--text-4)' }}>—</span>
            ) : deltaPct === 0 ? (
              <>
                <span style={{ color: 'var(--text-3)' }}>→ 동일</span>
                <span style={{ color: 'var(--text-4)' }}>전월 대비</span>
              </>
            ) : (
              <>
                <span className={deltaPct > 0 ? 'up' : 'down'}>
                  {deltaPct > 0 ? (
                    <Icon.arrowUp
                      style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-2px' }}
                    />
                  ) : (
                    <Icon.arrowDown
                      style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-2px' }}
                    />
                  )}{' '}
                  {deltaPct > 0 ? '+' : ''}
                  {formatPercent(deltaPct)}
                </span>
                <span style={{ color: 'var(--text-4)' }}>전월 대비</span>
              </>
            )}
          </div>
        </div>
        {momSeries.length > 0 ? (
          <MomBars series={momSeries} labels={momLabels} />
        ) : (
          <Sparkline data={salesSparkline} color="#3182F6" />
        )}
      </button>

      <div className="card kpi-card">
        <div>
          <div className="label">
            평균 원가율{isMain && <span className="pill">피자 카테고리</span>}
          </div>
          <div
            className="value num"
            style={{ color: safeCostRate == null ? 'var(--text-4)' : undefined }}
          >
            {safeCostRate == null ? '—' : safeCostRate.toFixed(1)}
            <span className="unit">%</span>
          </div>
          <div className="trend">
            <span style={{ color: 'var(--text-4)' }}>원가 모듈 구축 예정</span>
          </div>
        </div>
        <Sparkline data={costSparkline} color="#10B981" />
      </div>

      <button
        className="card kpi-card kpi-clickable"
        onClick={() => router?.push?.('/note')}
        style={kpiButtonStyle}
      >
        <div>
          <div className="label">진행 중 R&amp;D 노트</div>
          <div className={notePopped ? 'value num count-landed' : 'value num'}>
            {safeNoteCount}
            <span className="unit">건</span>
          </div>
          <div className="trend">
            {safeReportingCount > 0 ? (
              <>
                <span style={{ color: 'var(--accent-text)' }}>+{safeReportingCount} 보고예정</span>
                <span style={{ color: 'var(--text-4)' }}>이번 주</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-4)' }}>아직 보고예정 없음</span>
            )}
          </div>
        </div>
        <Sparkline data={noteSparkline} color="#3182F6" />
      </button>
    </div>
  );
});
