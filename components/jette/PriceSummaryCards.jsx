'use client';
import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { CHANGE_STATUS } from './managed-products-constants';
import { asObjectArray } from '@/lib/ui/prop-guards';

/**
 * PriceSummaryCards — 가격 변동 요약 4카드 (인상/인하/변동없음/관리대상)
 *
 * @param {Array} diffRows — comparePriceLists 결과
 */
export function PriceSummaryCards({ diffRows }) {
  const safeDiffRows = useMemo(() => asObjectArray(diffRows), [diffRows]);
  const summary = useMemo(() => {
    const up = safeDiffRows.filter(r => r.changeStatus === CHANGE_STATUS.UP).length;
    const down = safeDiffRows.filter(r => r.changeStatus === CHANGE_STATUS.DOWN).length;
    const same = safeDiffRows.filter(r => r.changeStatus === CHANGE_STATUS.SAME).length;
    const total = safeDiffRows.length;
    return { up, down, same, total };
  }, [safeDiffRows]);

  const pctOf = n => (summary.total > 0 ? Math.round((n / summary.total) * 100) : 0);

  return (
    <div className="hero-row" style={{ marginTop: 16 }}>
      <Card
        label="가격 인상"
        value={summary.up}
        unit="개"
        color="var(--negative)"
        foot={`전체 ${formatNumber(summary.total)}개 중 ${pctOf(summary.up)}%`}
      />
      <Card
        label="가격 인하"
        value={summary.down}
        unit="개"
        color="var(--positive)"
        foot={`전체 ${formatNumber(summary.total)}개 중 ${pctOf(summary.down)}%`}
      />
      <Card label="변동 없음" value={summary.same} unit="개" foot="이전 단가 대비 동일" />
      <Card label="관리 대상 품목" value={summary.total} unit="개" foot="현재 비교 대상 전체" />
    </div>
  );
}

function Card({ label, value, unit, color, foot }) {
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num" style={color ? { color } : undefined}>
          {formatNumber(value)}
          <span className="unit">{unit}</span>
        </div>
        <div className="trend">
          <span style={{ color: 'var(--text-3)' }}>{foot}</span>
        </div>
      </div>
    </div>
  );
}
