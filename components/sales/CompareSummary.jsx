'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * CompareSummary — 비교 요약 3카드 (총 판매량 / 신규 / 단종)
 */
export function CompareSummary({ compare }) {
  if (!compare) return null;
  const { totalA, totalB, totalDiff, totalPct, newMenus, droppedMenus, periodA, periodB } = compare;
  const safeNewMenus = asObjectArray(newMenus);
  const safeDroppedMenus = asObjectArray(droppedMenus);
  const safeTotalA = Number.isFinite(Number(totalA)) ? Number(totalA) : 0;
  const safeTotalB = Number.isFinite(Number(totalB)) ? Number(totalB) : 0;
  const safeTotalDiff = Number.isFinite(Number(totalDiff)) ? Number(totalDiff) : 0;
  const safeTotalPct =
    totalPct == null ? null : Number.isFinite(Number(totalPct)) ? Number(totalPct) : null;

  return (
    <div className="hero-row" style={{ marginTop: 16 }}>
      {/* 총 판매량 비교 */}
      <div className="card kpi-card">
        <div>
          <div className="label">총 판매량 비교</div>
          <div className="value num">
            {formatNumber(safeTotalA)}
            <span className="unit">개</span>
          </div>
          <div className="trend">
            {safeTotalPct == null ? (
              <span style={{ color: 'var(--text-4)' }}>비교 데이터 없음</span>
            ) : (
              <span className={safeTotalPct >= 0 ? 'up' : 'down'}>
                {safeTotalPct >= 0 ? (
                  <Icon.arrowUp
                    style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-2px' }}
                  />
                ) : (
                  <Icon.arrowDown
                    style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-2px' }}
                  />
                )}{' '}
                {safeTotalPct >= 0 ? '+' : ''}
                {safeTotalPct.toFixed(1)}%
                <span style={{ color: 'var(--text-4)', marginLeft: 6 }}>
                  ({safeTotalDiff >= 0 ? '+' : ''}
                  {formatNumber(safeTotalDiff)}개)
                </span>
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          {formatNumber(safeTotalB)}개 →{' '}
          <b style={{ color: 'var(--text-1)' }}>{formatNumber(safeTotalA)}개</b>
        </div>
      </div>

      {/* 신규 메뉴 */}
      <MovementCard
        label="신규 출시 메뉴"
        count={safeNewMenus.length}
        color="var(--positive)"
        desc={`${formatPeriod(periodB)}에 없던 메뉴`}
        items={safeNewMenus.slice(0, 3)}
        prefix="+"
      />

      {/* 단종 메뉴 */}
      <MovementCard
        label="단종·중단 메뉴"
        count={safeDroppedMenus.length}
        color="var(--negative)"
        desc={`${formatPeriod(periodA)}에 판매 없음`}
        items={safeDroppedMenus.slice(0, 3)}
        prefix="−"
        useFieldB
      />
    </div>
  );
}

function MovementCard({ label, count, color, desc, items, prefix, useFieldB }) {
  const safeItems = asObjectArray(items);
  const safeLabel = asDisplayText(label);
  const safeDesc = asDisplayText(desc);
  const safeColor = asDisplayText(color, 'var(--text-1)');
  const safePrefix = asDisplayText(prefix);
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;

  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{safeLabel}</div>
        <div className="value num" style={{ color: safeColor }}>
          {formatNumber(safeCount)}
          <span className="unit">개</span>
        </div>
        <div className="trend">
          <span style={{ color: 'var(--text-3)' }}>{safeDesc}</span>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {safeItems.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>해당 메뉴 없음</div>
        ) : (
          safeItems.map((m, index) => {
            const name = asDisplayText(m.name, '-');
            const value = Number.isFinite(Number(useFieldB ? m.b : m.a))
              ? Number(useFieldB ? m.b : m.a)
              : 0;

            return (
              <div
                key={`${name}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <span
                  title={name}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}
                >
                  {name}
                </span>
                <span className="num" style={{ color: safeColor, fontWeight: 700 }}>
                  {safePrefix}
                  {formatNumber(value)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatPeriod(p) {
  if (!p) return '-';
  return `${asDisplayText(p.year, '-')}년 ${asDisplayText(p.month, '-')}월`;
}
