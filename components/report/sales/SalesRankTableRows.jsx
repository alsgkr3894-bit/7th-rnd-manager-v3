'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { safeRevenue } from '@/lib/sales/revenue';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { DiscontinuedBadge } from '@/components/sales/DiscontinuedBadge';
import { IrregularMenuBadge } from '@/components/sales/IrregularMenuBadge';

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

export function SalesRankItemRows({
  item,
  index,
  opts,
  canEdit = false,
  onMarkIrregular,
  onUnmarkIrregular,
  onUndiscontinue,
}) {
  const canMark = typeof onMarkIrregular === 'function';
  const canUnmark = canEdit && typeof onUnmarkIrregular === 'function';
  const canUndiscontinue = canEdit && typeof onUndiscontinue === 'function';
  return (
    <Fragment>
      <tr>
        <td className="num">{index + 1}</td>
        <td style={{ fontWeight: 600 }}>
          {asDisplayText(item.name, '—')}
          {item.irregular ? (
            <IrregularMenuBadge
              onUnmark={canUnmark ? () => onUnmarkIrregular(item.name) : undefined}
            />
          ) : (
            item.discontinued && (
              <DiscontinuedBadge
                onUnmark={canUndiscontinue ? () => onUndiscontinue(item.name) : undefined}
              />
            )
          )}
          {item.unregistered && canEdit && canMark && (
            <button
              type="button"
              className="chip mark-irregular-btn no-print"
              onClick={() => onMarkIrregular(item.name)}
              title="메뉴마스터에 없는 판매명입니다 — 아직 단종 등록 전이에요. 눌러서 단종(비정규메뉴)으로 등록"
              style={{
                marginLeft: 6,
                fontSize: 10,
                padding: '1px 6px',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px dashed var(--border)',
                background: 'transparent',
                color: 'var(--text-3)',
              }}
            >
              + 단종
            </button>
          )}
        </td>
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
