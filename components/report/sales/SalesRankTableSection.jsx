'use client';
import { Fragment } from 'react';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { SectionDot, S_EMPTY_STATE, S_SECTION_TITLE_FLEX } from './SalesReportSectionParts';

function SalesCategoryBarRows({ items, catColor, catTotal }) {
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

export function SalesRankTableSection({ opts, periodLabel, catShares, groupRanking }) {
  if (groupRanking.length === 0) {
    return (
      <div className="paper-section">
        <div style={S_EMPTY_STATE}>데이터 없음</div>
      </div>
    );
  }

  const catOrder = catShares.map(category => asDisplayText(category.name, '미분류'));
  const grouped = {};
  for (const item of groupRanking) {
    const category = asDisplayText(item.category, '미분류') || '미분류';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }
  const categories = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
    category => grouped[category]
  );

  return categories.map(category => {
    const items = grouped[category];
    const catColor =
      catShares.find(item => asDisplayText(item.name) === category)?.color || '#6B7280';
    const catTotal = items.reduce((sum, item) => sum + safeQuantity(item.quantity), 0);

    return (
      <div className="paper-section paper-cat-section" key={category}>
        <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
          <SectionDot color={catColor} />
          {category} 순위 — {periodLabel}
          <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
            합계 {formatNumber(catTotal)}건
          </span>
        </div>

        {opts.catBar && (
          <SalesCategoryBarRows items={items} catColor={catColor} catTotal={catTotal} />
        )}

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
              <Fragment key={item.name}>
                <tr>
                  <td className="num">{index + 1}</td>
                  <td style={{ fontWeight: 600 }}>{asDisplayText(item.name, '—')}</td>
                  <td className="num right">{formatNumber(safeQuantity(item.quantity))}</td>
                  {opts.prevComp && (
                    <td className="num right muted">
                      {safeQuantity(item.prevQty) > 0
                        ? formatNumber(safeQuantity(item.prevQty))
                        : '—'}
                    </td>
                  )}
                  {opts.prevComp && (
                    <td
                      className="num right"
                      style={{
                        color:
                          safeQuantity(item.delta) > 0
                            ? 'var(--positive)'
                            : safeQuantity(item.delta) < 0
                              ? 'var(--negative)'
                              : 'inherit',
                      }}
                    >
                      {safeQuantity(item.delta) !== 0
                        ? `${safeQuantity(item.delta) > 0 ? '+' : ''}${formatNumber(safeQuantity(item.delta))}`
                        : '—'}
                    </td>
                  )}
                </tr>
                {opts.variant &&
                  asObjectArray(item.sizes).map(size => (
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
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  });
}
