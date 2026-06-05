'use client';
import { memo, Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';

// 임계값(경고/비상) 기본 30/40 — 사용자 조절값을 받으면 그 값 사용
const MC_COST = (pct, warn = 30, crit = 40) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)    return 'var(--negative, #ef4444)';
  if (pct <  warn) return 'var(--positive, #10b981)';
  if (pct <  crit) return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

const MC_MARGIN = (pct, warn = 30, crit = 40) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)            return 'var(--negative, #ef4444)';
  if (pct >= 100 - warn)   return 'var(--positive, #10b981)';
  if (pct >= 100 - crit)   return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

export const MC = (pct, mode, warn, crit) => mode === 'margin' ? MC_MARGIN(pct, warn, crit) : MC_COST(pct, warn, crit);

const GRP_BORDER = { borderLeft: '2px solid var(--divider)' };

export const MarginRow = memo(function MarginRow({ r, sizeLabels, activePlatform, discount, hasAdjustment, viewMode, warnPct = 30, critPct = 40, onToggleHide }) {
  return (
    <tr style={r.hidden ? { opacity: .5 } : undefined}>
      <td className="sticky-col" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
        {r.menuName}
        {r.menuCode && (
          <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'monospace', fontWeight: 400 }}>{r.menuCode}</div>
        )}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}><span className="chip">{r.menuCategory || '기타'}</span></td>

      {sizeLabels.map(l => {
        const cost = r.costMap?.[l] || 0;
        const s    = r.sizes?.find(s => s.label === l);

        // 할인적용금액
        let netCell = null;
        if (hasAdjustment) {
          if (!s?.sellingPrice) {
            netCell = <td key={l+'_n'} style={{ textAlign:'right', color:'var(--text-3)' }}>—</td>;
          } else {
            const eff = applyDiscount(s.sellingPrice, discount);
            const net = calcNetRevenue(eff, activePlatform.fees, l);
            netCell = (
              <td key={l+'_n'} className="mt-num" style={{ textAlign:'right', fontSize:12, color:'var(--text-2)' }}>
                {formatNumber(Math.round(net))}<span className="mt-won">원</span>
                {eff !== s.sellingPrice && (
                  <div style={{ fontSize:10, color:'var(--text-4)' }}>{formatNumber(eff)}원 기준</div>
                )}
              </td>
            );
          }
        }

        // 원가율/마진율
        const eff      = applyDiscount(s?.sellingPrice, discount);
        const net      = calcNetRevenue(eff, activePlatform.fees, l);
        const costRate = calcPlatformMargin(cost, net);
        const display  = costRate != null ? (viewMode === 'margin' ? 100 - costRate : costRate) : null;
        const baseCostRate = hasAdjustment ? calcPlatformMargin(cost, s?.sellingPrice || 0) : null;
        const baseDisplay  = baseCostRate != null ? (viewMode === 'margin' ? 100 - baseCostRate : baseCostRate) : null;

        const rateColor = display != null ? MC(display, viewMode, warnPct, critPct) : null;
        return (
          <Fragment key={l}>
            <td className="mt-num" style={{ ...GRP_BORDER, textAlign:'right', color:'var(--text-2)' }}>
              {cost > 0 ? <>{formatNumber(Math.round(cost))}<span className="mt-won">원</span></> : '—'}
            </td>
            <td className="mt-num" style={{ textAlign:'right', color:'var(--text-2)' }}>
              {s?.sellingPrice != null ? <>{formatNumber(s.sellingPrice)}<span className="mt-won">원</span></> : '—'}
            </td>
            {netCell}
            <td style={{ textAlign:'right' }}>
              {display != null ? (
                <span className="mt-rate" style={{ color: rateColor, background: `color-mix(in srgb, ${rateColor} 14%, transparent)` }}>
                  {display.toFixed(1)}%
                </span>
              ) : '—'}
              {baseDisplay != null && baseDisplay !== display && (
                <span style={{ fontSize:10, color:'var(--text-4)', marginLeft:5 }}>({baseDisplay.toFixed(1)}%)</span>
              )}
            </td>
          </Fragment>
        );
      })}

      <td>
        <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
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
          {r.menuCode && onToggleHide && (
            <button className="btn sm" style={{ padding:'2px 6px', fontSize:10, color: r.hidden ? 'var(--accent)' : 'var(--text-3)' }}
              title={r.hidden ? '표시' : '숨김(표·통계 제외)'}
              onClick={() => onToggleHide(r)}>
              {r.hidden ? '표시' : '숨김'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});
