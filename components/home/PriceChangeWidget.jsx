'use client';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * 식자재 단가 변동 — 최근 변동 식자재. 단가 상승=negative(나쁨), 하락=positive(좋음).
 *
 * @param {{ items: Array<{name, sub, pct, dir}>, router }} props
 */
export function PriceChangeWidget({ items = [], router }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">식자재 단가 변동</div>
          <div className="card-sub">최근 단가 변경 이력</div>
        </div>
        <button className="link accent" onClick={() => router.push('/cost/ingredient-price')}>
          전체 <Icon.chevRight />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon.tag style={{ width: 28, height: 28 }} />}
          title="단가 변동 내역이 없어요"
          desc="단가를 갱신하면 변동이 기록됩니다"
          compact
        />
      ) : (
        <div>
          {items.map((it, i) => (
            <div key={i} className="price-row">
              <div className="pr-meta">
                <span className="pr-name" title={it.name}>{it.name}</span>
                <span className="pr-sub">{it.sub}</span>
              </div>
              <span className={`price-chip ${it.dir}`}>
                {it.dir === 'up' ? '▲' : '▼'} {Math.abs(it.pct).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
