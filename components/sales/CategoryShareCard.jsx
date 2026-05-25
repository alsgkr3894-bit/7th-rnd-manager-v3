'use client';
import { Donut } from '@/components/charts/Donut';
import { formatNumber } from '@/lib/format';

/**
 * CategoryShareCard — 기준 월의 카테고리별 판매 비중
 *
 * @param {{ total, items: [{name, value, color}, ...] }} share
 * @param {{year, month}} period
 */
export function CategoryShareCard({ share, period, selector, title = '카테고리 판매 비중' }) {
  if (!share || share.total === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{title}</div>
            <div className="card-sub">{period ? `${period.year}년 ${period.month}월 기준` : '데이터 없음'}</div>
          </div>
          {selector}
        </div>
        <div style={{padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          해당 월에 판매 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card ring-card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{period.year}년 {period.month}월 · 총 {formatNumber(share.total)}개</div>
        </div>
        {selector}
      </div>
      <div className="ring-wrap">
        <div className="ring">
          <Donut items={share.items} />
          <div className="center">
            <div className="v num">{formatNumber(share.total)}</div>
            <div className="l">개</div>
          </div>
        </div>
        <div className="ring-rows">
          {share.items.map(c => (
            <div key={c.name} className="ring-row">
              <div className="swatch" style={{background: c.color}}/>
              <div className="name">{c.name}</div>
              <div className="v num">{((c.value / share.total) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
