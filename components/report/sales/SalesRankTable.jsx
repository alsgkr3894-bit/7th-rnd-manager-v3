'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

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
