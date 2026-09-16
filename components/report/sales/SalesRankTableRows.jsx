'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { safeRevenue } from '@/lib/sales/revenue';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { DiscontinuedBadge } from '@/components/sales/DiscontinuedBadge';
import { IrregularMenuBadge } from '@/components/sales/IrregularMenuBadge';
import { UnregisteredBadge } from '@/components/sales/UnregisteredBadge';
import { FlagToggleChip } from '@/components/sales/FlagToggleChip';

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
  onToggleUnregistered,
}) {
  const canUnmark = canEdit && typeof onUnmarkIrregular === 'function';
  const canUndiscontinue = canEdit && typeof onUndiscontinue === 'function';
  const canToggleUnregistered = canEdit && typeof onToggleUnregistered === 'function';
  const canToggleIrregular =
    canEdit && typeof onMarkIrregular === 'function' && typeof onUnmarkIrregular === 'function';
  // 메뉴마스터 미등록 후보(자동 판정·해제·비정규메뉴 단종 처리) 행에만 토글 칩을 붙인다.
  // 칩이 보이는 관리자 화면에서는 같은 뜻의 배지를 인쇄 전용으로 돌려 표시가 겹치지 않게 한다.
  const isCandidate = !!(item.irregular || item.unregistered || item.registeredOverride);
  const showToggles = isCandidate && (canToggleUnregistered || canToggleIrregular);
  return (
    <Fragment>
      <tr>
        <td className="num">{index + 1}</td>
        <td style={{ fontWeight: 600 }}>
          {asDisplayText(item.name, '—')}
          {item.irregular ? (
            <IrregularMenuBadge
              printOnly={showToggles}
              onUnmark={canUnmark ? () => onUnmarkIrregular(item.name) : undefined}
            />
          ) : (
            item.discontinued && (
              <DiscontinuedBadge
                onUnmark={canUndiscontinue ? () => onUndiscontinue(item.name) : undefined}
              />
            )
          )}
          {item.unregistered && <UnregisteredBadge printOnly={showToggles} />}
          {showToggles && canToggleUnregistered && (
            <FlagToggleChip
              label="미등록"
              checked={!!item.unregistered}
              disabled={!!item.irregular}
              onChange={v => onToggleUnregistered(item.name, v)}
              title={
                item.irregular
                  ? '단종 처리된 항목 — 단종을 해제하면 다시 미등록 판정으로 돌아갑니다'
                  : '체크 해제: 메뉴마스터에 등록된 메뉴로 간주(미등록 아님) / 다시 체크: 미등록으로 되돌림'
              }
            />
          )}
          {showToggles && canToggleIrregular && (
            <FlagToggleChip
              label="단종"
              tone="warn"
              checked={!!item.irregular}
              onChange={v => (v ? onMarkIrregular(item.name) : onUnmarkIrregular(item.name))}
              title="체크: 메뉴마스터에 없는 판매명을 단종(비정규메뉴)으로 등록 / 해제: 되돌림"
            />
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
