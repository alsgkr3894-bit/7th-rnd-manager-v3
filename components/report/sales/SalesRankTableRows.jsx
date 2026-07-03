'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { safeRevenue } from '@/lib/sales/revenue';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function SalesVariantRows({ item, opts }) {
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
      {opts.revenue && (
        <td className="num right muted" style={{ fontSize: 11 }}>
          {formatNumber(safeRevenue(size.revenue))}
        </td>
      )}
      {opts.prevComp && <td />}
      {opts.prevComp && <td />}
    </tr>
  ));
}

export function SalesRankDeltaCell({ delta }) {
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

export function SalesRankItemRows({ item, index, opts }) {
  return (
    <Fragment>
      <tr>
        <td className="num">{index + 1}</td>
        <td style={{ fontWeight: 600 }}>{asDisplayText(item.name, '—')}</td>
        <td className="num right">{formatNumber(safeQuantity(item.quantity))}</td>
        {opts.revenue && <td className="num right">{formatNumber(safeRevenue(item.revenue))}</td>}
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
