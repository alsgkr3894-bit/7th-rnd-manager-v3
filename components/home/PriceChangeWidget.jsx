'use client';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 식자재 단가 변동 — 최근 변동 식자재. 단가 상승=negative(나쁨), 하락=positive(좋음).
 *
 * @param {{ items: Array<{name, sub, pct, dir}>, router }} props
 */
export function PriceChangeWidget({ items = [], router }) {
  const safeItems = asObjectArray(items);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">식자재 단가 변동</div>
          <div className="card-sub">최근 단가 변경 이력</div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/cost/ingredient-price')}>
          전체 <Icon.chevRight />
        </button>
      </div>

      {safeItems.length === 0 ? (
        <EmptyState
          icon={<Icon.tag style={{ width: 28, height: 28 }} />}
          title="단가 변동 내역이 없어요"
          desc="단가를 갱신하면 변동이 기록됩니다"
          compact
        />
      ) : (
        <div>
          {safeItems.map((it, i) => {
            const dir = it.dir === 'up' ? 'up' : 'down';
            const pct = Number(it.pct);
            const pctText = Number.isFinite(pct) ? Math.abs(pct).toFixed(1) : '0.0';
            const name = asDisplayText(it.name);
            const sub = asDisplayText(it.sub);
            return (
              <div key={i} className="price-row">
                <div className="pr-meta">
                  <span className="pr-name" title={name}>{name}</span>
                  <span className="pr-sub">{sub}</span>
                </div>
                <span className={`price-chip ${dir}`}>
                  {dir === 'up' ? '▲' : '▼'} {pctText}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
