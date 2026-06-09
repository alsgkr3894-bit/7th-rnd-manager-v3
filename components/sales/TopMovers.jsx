'use client';
import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * TopMovers — 증가율 / 감소율 TOP 3 (양쪽 데이터 모두 있는 메뉴 중)
 */
export function TopMovers({ topRise, topFall }) {
  return (
    <div className="mid-row" style={{ marginTop: 16 }}>
      <MoverCard
        title="TOP 상승 메뉴"
        sub="피자 · 사이드 · 1인피자 · 양 기간 모두 판매 있는 메뉴만"
        icon={<Icon.arrowUp style={{ width: 16, height: 16, color: 'var(--positive)' }} />}
        items={topRise}
        color="var(--positive)"
        arrow="▲"
      />
      <MoverCard
        title="TOP 하락 메뉴"
        sub="피자 · 사이드 · 1인피자 · 양 기간 모두 판매 있는 메뉴만"
        icon={<Icon.arrowDown style={{ width: 16, height: 16, color: 'var(--negative)' }} />}
        items={topFall}
        color="var(--negative)"
        arrow="▼"
      />
    </div>
  );
}

function MoverCard({ title, sub, icon, items, color, arrow }) {
  const safeItems = asObjectArray(items);
  const safeTitle = asDisplayText(title);
  const safeSub = asDisplayText(sub);
  const safeColor = asDisplayText(color, 'var(--text-1)');
  const safeArrow = asDisplayText(arrow);

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <div className="card-title">{safeTitle}</div>
          <div className="card-sub">{safeSub}</div>
        </div>
        {icon}
      </div>
      {safeItems.length === 0 ? (
        <div
          style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
        >
          비교 가능한 메뉴가 없습니다
        </div>
      ) : (
        <div className="rank-list">
          {safeItems.map((r, i) => {
            const name = asDisplayText(r.name, '-');
            const pct = Number.isFinite(Number(r.pct)) ? Number(r.pct) : 0;

            return (
              <div className="rank-row" key={`${name}-${i}`}>
                <div
                  className="rank-num num"
                  style={{ background: 'transparent', color: safeColor }}
                >
                  {i + 1}
                </div>
                <div className="rank-name">{name}</div>
                <div
                  className="num"
                  style={{ fontWeight: 800, color: safeColor, whiteSpace: 'nowrap' }}
                >
                  {safeArrow} {Math.abs(pct).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
