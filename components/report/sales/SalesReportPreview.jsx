'use client';
import { Fragment } from 'react';
import SalesKpiCards from '@/components/report/SalesKpiCards';
import { SalesMoverRow, SalesRankRow } from '@/components/report/sales/SalesChartRows';
import { formatNumber } from '@/lib/format';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const S_SECTION_TITLE_FLEX = { display: 'flex', alignItems: 'center', gap: 8 };
const S_EMPTY_STATE = {
  height: 60,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-4)',
  fontSize: 13,
};
const S_MOVER_LABEL = { fontSize: 11, fontWeight: 700, marginBottom: 6 };

function scopeLabel(scope) {
  return scope === 'all' ? '전체 메뉴' : asDisplayText(scope, '전체 메뉴');
}

function SectionDot({ color }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function SalesCategoryShareSection({ catShares, totalShare }) {
  if (catShares.length === 0) return null;

  return (
    <div className="paper-section">
      <div className="paper-section-title">카테고리별 판매 비중</div>
      <div className="share-stack" style={{ marginTop: 10 }}>
        {catShares.map(category => (
          <div
            key={asDisplayText(category.name, '미분류')}
            className="share-seg"
            style={{ flex: safeQuantity(category.value), background: category.color }}
            title={`${asDisplayText(category.name, '미분류')} ${
              totalShare > 0 ? ((safeQuantity(category.value) / totalShare) * 100).toFixed(1) : 0
            }%`}
          />
        ))}
      </div>
      <div className="paper-legend">
        {catShares.map(category => (
          <div className="paper-legend-item" key={asDisplayText(category.name, '미분류')}>
            <span className="dot" style={{ background: category.color }} />
            <span>{asDisplayText(category.name, '미분류')}</span>
            <span className="num muted">{formatNumber(safeQuantity(category.value))}건</span>
            <span className="num" style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
              {totalShare > 0 ? ((safeQuantity(category.value) / totalShare) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesPizzaMoverSection({ catShares, groupRanking }) {
  const all = groupRanking.filter(item =>
    isPizzaCategory(item.category, { includePersonal: false })
  );
  if (all.length === 0) return null;

  const pizzaColor =
    catShares.find(category => asDisplayText(category.name).includes('피자'))?.color || '#E1101F';

  const pizzaItems = all.filter(item => item.prevQty > 0);
  const risers = [...pizzaItems].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const fallers = [...pizzaItems].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const maxAbs = Math.max(...pizzaItems.map(item => Math.abs(item.delta)), 1);

  const count = Math.min(5, Math.floor(all.length / 2));
  const best = all.slice(0, count);
  const worst = all.slice(-count).reverse();
  const bestMax = safeQuantity(best[0]?.quantity) || 1;

  return (
    <div className="paper-section">
      <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
        <SectionDot color={pizzaColor} />
        피자 전월 대비 상승 / 하락 TOP 5
      </div>

      {pizzaItems.length > 0 ? (
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--positive)' }}>▲ 상승 TOP 5</div>
            {risers.map(item => (
              <SalesMoverRow key={item.name} m={item} up maxAbs={maxAbs} />
            ))}
          </div>
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--negative)' }}>▼ 하락 TOP 5</div>
            {fallers.map(item => (
              <SalesMoverRow key={item.name} m={item} up={false} maxAbs={maxAbs} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>
          전월 데이터가 없어 전월 대비를 표시할 수 없습니다.
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: pizzaColor }}>▲ 베스트 5</div>
            {best.map(item => (
              <SalesRankRow
                key={item.name}
                m={item}
                accent={pizzaColor}
                valueColor={pizzaColor}
                bestMax={bestMax}
              />
            ))}
          </div>
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--text-3)' }}>▼ 워스트 5</div>
            {worst.map(item => (
              <SalesRankRow
                key={item.name}
                m={item}
                accent="#94A3B8"
                valueColor="var(--text-3)"
                bestMax={bestMax}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function SalesRankTableSection({ opts, periodLabel, catShares, groupRanking }) {
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

function SalesCompareTableSection({
  compareData,
  catShares,
  groupRanking,
  periodLabel,
  cmpYear,
  cmpMonth,
}) {
  if (!compareData) {
    return (
      <div className="paper-section">
        <div style={S_EMPTY_STATE}>비교 데이터 없음</div>
      </div>
    );
  }

  const catNameMap = new Map(
    groupRanking.map(item => [
      asDisplayText(item.name, '—'),
      asDisplayText(item.category, '미분류') || '미분류',
    ])
  );
  const sortedRows = asObjectArray(compareData.rows)
    .filter(row => !row.aIsZero)
    .sort((a, b) => safeQuantity(b.a) - safeQuantity(a.a));
  const grouped = {};
  for (const row of sortedRows) {
    const category = catNameMap.get(asDisplayText(row.name, '—')) || '미분류';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(row);
  }
  const catOrder = catShares.map(category => asDisplayText(category.name, '미분류'));
  const categories = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
    category => grouped[category]
  );

  return (
    <>
      {categories.map(category => {
        const items = grouped[category];
        const catColor =
          catShares.find(item => asDisplayText(item.name) === category)?.color || '#6B7280';
        return (
          <div className="paper-section paper-cat-section" key={category}>
            <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
              <SectionDot color={catColor} />
              {category} — {periodLabel} vs {cmpYear}년 {cmpMonth}월
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>메뉴명 (중분류)</th>
                  <th style={{ width: 90, textAlign: 'right' }}>{periodLabel}</th>
                  <th style={{ width: 90, textAlign: 'right' }}>
                    {cmpYear}년{cmpMonth}월
                  </th>
                  <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                  <th style={{ width: 70, textAlign: 'right' }}>증감%</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={asDisplayText(item.name, '—')}>
                    <td className="num">{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{asDisplayText(item.name, '—')}</td>
                    <td className="num right">{formatNumber(safeQuantity(item.a))}</td>
                    <td className="num right muted">
                      {safeQuantity(item.b) > 0 ? formatNumber(safeQuantity(item.b)) : '—'}
                    </td>
                    <td
                      className="num right"
                      style={{
                        color:
                          safeQuantity(item.diff) > 0
                            ? 'var(--positive)'
                            : safeQuantity(item.diff) < 0
                              ? 'var(--negative)'
                              : 'inherit',
                      }}
                    >
                      {safeQuantity(item.diff) !== 0
                        ? `${safeQuantity(item.diff) > 0 ? '+' : ''}${formatNumber(safeQuantity(item.diff))}`
                        : '—'}
                    </td>
                    <td className="num right muted" style={{ fontSize: 11 }}>
                      {asFiniteNumber(item.pct, null) != null
                        ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 4,
          padding: '6px 0',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        합계 {formatNumber(safeQuantity(compareData.totalA))}건 →
        {asFiniteNumber(compareData.totalPct, null) != null
          ? ` ${compareData.totalPct >= 0 ? '+' : ''}${compareData.totalPct.toFixed(1)}%`
          : ' —'}
        (전월 {formatNumber(safeQuantity(compareData.totalB))}건)
      </div>
    </>
  );
}

function SalesExcludedListSection({ excludedList }) {
  return (
    <div className="paper-section" style={{ pageBreakBefore: 'always', marginTop: 24 }}>
      <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
        <SectionDot color="var(--text-3)" />
        품목 제외 리스트
        <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {excludedList.length}개
        </span>
      </div>
      {excludedList.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>
          제외된 품목이 없습니다.
        </div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {excludedList.map((name, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-2)',
                minWidth: 140,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--text-3)',
                  flexShrink: 0,
                }}
              />
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesReportPreview({
  periodLabel,
  scope,
  viewMode,
  cmpYear,
  cmpMonth,
  todayLabel,
  profileName,
  opts,
  kpi,
  catShares,
  groupRanking,
  totalShare,
  compareData,
  excludedList,
}) {
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  const safeExcludedList = Array.isArray(excludedList) ? excludedList : [];

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
        <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
        <div className="paper-meta">
          <span>대상: {scopeLabel(scope)}</span>
          <span>·</span>
          <span>
            {viewMode === 'compare' ? `비교: ${cmpYear}년 ${cmpMonth}월` : '해당 월 순위'}
          </span>
          <span>·</span>
          <span className="mono">
            생성일 {todayLabel} · {asDisplayText(profileName, '')}
          </span>
        </div>
      </div>

      {safeOpts.summary && (
        <SalesKpiCards kpi={kpi} catShares={safeCatShares} groupRanking={safeGroupRanking} />
      )}

      {safeOpts.catShare && (
        <SalesCategoryShareSection catShares={safeCatShares} totalShare={totalShare} />
      )}

      {safeOpts.pizzaMover && viewMode === 'rank' && (
        <SalesPizzaMoverSection catShares={safeCatShares} groupRanking={safeGroupRanking} />
      )}

      {safeOpts.rankTable && viewMode === 'rank' && (
        <SalesRankTableSection
          opts={safeOpts}
          periodLabel={periodLabel}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
        />
      )}

      {safeOpts.rankTable && viewMode === 'compare' && (
        <SalesCompareTableSection
          compareData={compareData}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          periodLabel={periodLabel}
          cmpYear={cmpYear}
          cmpMonth={cmpMonth}
        />
      )}

      {safeOpts.excluded && <SalesExcludedListSection excludedList={safeExcludedList} />}

      <div className="paper-foot">
        <span className="muted" style={{ fontSize: 11 }}>
          7번가 R&amp;D 플랫폼
        </span>
      </div>
    </>
  );
}
