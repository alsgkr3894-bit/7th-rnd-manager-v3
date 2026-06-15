'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function SalesCategoryBarRows({ items, catColor, catTotal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '10px 0 14px' }}>
      {items.map((item, index) => {
        const quantity = safeQuantity(item.quantity);
        const pct = catTotal > 0 ? (quantity / catTotal) * 100 : 0;
        return (
          <div
            key={item.name}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: catColor,
                flexShrink: 0,
                opacity: 0.5 + 0.5 * (1 - index / items.length),
              }}
            />
            <div
              style={{
                width: 130,
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-2)',
                fontWeight: index === 0 ? 700 : 400,
              }}
            >
              {asDisplayText(item.name, '—')}
            </div>
            <div
              style={{
                flex: 1,
                height: 10,
                background: 'var(--surface-2)',
                borderRadius: 2,
                overflow: 'hidden',
                minWidth: 60,
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: catColor,
                  borderRadius: 2,
                  opacity: 0.55 + 0.45 * (1 - index / items.length),
                }}
              />
            </div>
            <div
              style={{
                width: 38,
                textAlign: 'right',
                color: 'var(--text-3)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pct.toFixed(1)}%
            </div>
            <div
              style={{
                width: 52,
                textAlign: 'right',
                color: 'var(--text-2)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatNumber(quantity)}건
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesVariantRows({ item, opts }) {
  if (!opts.variant) return null;

  return asObjectArray(item.sizes).map(size => (
    <tr
      key={`${asDisplayText(item.name, '—')}-${asDisplayText(size.size, '기타')}`}
      style={{ background: 'var(--surface-2)' }}
    >
      <td />
      <td className="muted" style={{ fontSize: 11, paddingLeft: 20 }}>
        └ {asDisplayText(size.size, '기타')}
      </td>
      <td className="num right muted" style={{ fontSize: 11 }}>
        {formatNumber(safeQuantity(size.quantity))}
      </td>
      {opts.prevComp && <td />}
      {opts.prevComp && <td />}
    </tr>
  ));
}

function SalesRankDeltaCell({ delta }) {
  const safeDelta = safeQuantity(delta);
  return (
    <td
      className="num right"
      style={{
        color: safeDelta > 0 ? 'var(--positive)' : safeDelta < 0 ? 'var(--negative)' : 'inherit',
      }}
    >
      {safeDelta !== 0 ? `${safeDelta > 0 ? '+' : ''}${formatNumber(safeDelta)}` : '—'}
    </td>
  );
}

function SalesRankItemRows({ item, index, opts }) {
  return (
    <Fragment>
      <tr>
        <td className="num">{index + 1}</td>
        <td style={{ fontWeight: 600 }}>{asDisplayText(item.name, '—')}</td>
        <td className="num right">{formatNumber(safeQuantity(item.quantity))}</td>
        {opts.prevComp && (
          <td className="num right muted">
            {safeQuantity(item.prevQty) > 0 ? formatNumber(safeQuantity(item.prevQty)) : '—'}
          </td>
        )}
        {opts.prevComp && <SalesRankDeltaCell delta={item.delta} />}
      </tr>
      <SalesVariantRows item={item} opts={opts} />
    </Fragment>
  );
}

export function SalesRankTable({ items, opts }) {
  return (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>메뉴명 (중분류)</th>
          <th style={{ width: 90, textAlign: 'right' }}>판매량</th>
          {opts.prevComp && <th style={{ width: 80, textAlign: 'right' }}>전월</th>}
          {opts.prevComp && <th style={{ width: 80, textAlign: 'right' }}>증감</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <SalesRankItemRows key={item.name} item={item} index={index} opts={opts} />
        ))}
      </tbody>
    </table>
  );
}
