'use client';
import { memo } from 'react';
import { formatNumber } from '@/lib/format';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';
import { COST_RATE_THRESHOLD, MARGIN_RATE_THRESHOLD } from '@/lib/cost/margin/constants';

const MC_COST = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)   return 'var(--negative, #ef4444)';
  if (pct <= COST_RATE_THRESHOLD.GOOD)    return 'var(--positive, #10b981)';
  if (pct <= COST_RATE_THRESHOLD.WARNING) return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

const MC_MARGIN = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)   return 'var(--negative, #ef4444)';
  if (pct >= MARGIN_RATE_THRESHOLD.GOOD)    return 'var(--positive, #10b981)';
  if (pct >= MARGIN_RATE_THRESHOLD.WARNING) return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

export const MC = (pct, mode) => mode === 'margin' ? MC_MARGIN(pct) : MC_COST(pct);

export const MarginRow = memo(function MarginRow({ r, sizeLabels, activePlatform, discount, hasAdjustment, viewMode }) {
  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.menuName}</td>
      <td style={{ whiteSpace: 'nowrap' }}><span className="chip">{r.menuCategory || '기타'}</span></td>

      {sizeLabels.map(l => {
        const cost = r.costMap?.[l] || 0;
        return (
          <td key={l+'_c'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {cost > 0 ? `${formatNumber(Math.round(cost))}원` : '—'}
          </td>
        );
      })}

      {sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        return (
          <td key={l+'_p'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {s?.sellingPrice != null ? `${formatNumber(s.sellingPrice)}원` : '—'}
          </td>
        );
      })}

      {hasAdjustment && sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        if (!s?.sellingPrice) return <td key={l+'_n'} style={{ textAlign:'right', color:'var(--text-3)' }}>—</td>;
        const eff = applyDiscount(s.sellingPrice, discount);
        const net = calcNetRevenue(eff, activePlatform.fees, l);
        return (
          <td key={l+'_n'} style={{ textAlign:'right', fontSize:12, color:'var(--text-2)' }}>
            {formatNumber(Math.round(net))}원
            {eff !== s.sellingPrice && (
              <div style={{ fontSize:10, color:'var(--text-4)' }}>
                {formatNumber(eff)}원 기준
              </div>
            )}
          </td>
        );
      })}

      {sizeLabels.map(l => {
        const cost    = r.costMap?.[l] || 0;
        const s       = r.sizes?.find(s => s.label === l);
        const eff     = applyDiscount(s?.sellingPrice, discount);
        const net     = calcNetRevenue(eff, activePlatform.fees, l);
        const costRate = calcPlatformMargin(cost, net);
        const display  = costRate != null
          ? (viewMode === 'margin' ? 100 - costRate : costRate)
          : null;
        const baseCostRate = hasAdjustment
          ? calcPlatformMargin(cost, s?.sellingPrice || 0)
          : null;
        const baseDisplay = baseCostRate != null
          ? (viewMode === 'margin' ? 100 - baseCostRate : baseCostRate)
          : null;
        return (
          <td key={l+'_m'} style={{ textAlign:'right' }}>
            {display != null ? (
              <span style={{ fontWeight:700, color: MC(display, viewMode) }}>{display.toFixed(1)}%</span>
            ) : '—'}
            {baseDisplay != null && baseDisplay !== display && (
              <span style={{ fontSize:10, color:'var(--text-4)', marginLeft:5 }}>
                ({baseDisplay.toFixed(1)}%)
              </span>
            )}
          </td>
        );
      })}

      <td>
        <button className="btn sm" style={{ padding:'2px 6px', fontSize:10 }}
          onClick={async () => {
            const parts = [r.menuName, ...(sizeLabels.map(l => {
              const cost = r.costMap?.[l] || 0;
              const s = r.sizes?.find(s => s.label === l);
              const p = s?.sellingPrice || 0;
              const rate = (cost && p) ? (cost / p * 100).toFixed(1) + '%' : '-';
              return `${l}: ${p ? formatNumber(p) + '원' : '-'} / ${rate}`;
            }))];
            try { await navigator.clipboard.writeText(parts.join(' | ')); } catch {}
          }}
        >복사</button>
      </td>
    </tr>
  );
});
