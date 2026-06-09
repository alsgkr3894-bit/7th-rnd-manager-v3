'use client';
import { Fragment, useState, useEffect, useMemo } from 'react';
import { loadXlsx } from '@/lib/excel';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import SalesReportControls from '@/components/report/SalesReportControls';
import SalesKpiCards from '@/components/report/SalesKpiCards';
import { formatNumber, pad } from '@/lib/format';
import { initDB } from '@/lib/db/init';
import { getAll } from '@/lib/db';
import { buildPeriodCompare } from '@/lib/sales/compare';
import { buildGroupRanking } from '@/lib/sales/ranking';
import { getUserExcluded, getUserRules } from '@/lib/sales';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { getProfile } from '@/lib/profile';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { getActiveBrand } from '@/lib/active-brand';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const DRAFT_KEY = 'report_draft_sales';

const CAT_COLORS = ['#3182F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#E1101F', '#6B7280'];

function safeYear(value, fallback = new Date().getFullYear()) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1900 || n > 2999) return fallback;
  return Math.floor(n);
}

function safeMonth(value, fallback = new Date().getMonth() + 1) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1 || n > 12) return fallback;
  return Math.floor(n);
}

function safeQuantity(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

function safePercentWidth(value, maxValue) {
  const max = Math.abs(safeQuantity(maxValue));
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.abs(safeQuantity(value)) / max) * 100));
}

function normalizeScope(value) {
  return ['all', 'pizza', 'side'].includes(value) ? value : 'all';
}

function normalizePeriodMode(value) {
  return ['month', 'year'].includes(value) ? value : 'month';
}

function normalizeViewMode(value) {
  return ['rank', 'compare'].includes(value) ? value : 'rank';
}

/** 피자 전월 대비 상승/하락 행. maxAbs는 바 너비 계산에 사용. */
function MoverRow({ m, up, maxAbs }) {
  const row = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  const name = asDisplayText(row.name, '—');
  const delta = safeQuantity(row.delta);
  const quantity = safeQuantity(row.quantity);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{ height: 5, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${safePercentWidth(delta, maxAbs)}%`,
              height: '100%',
              background: up ? 'var(--positive)' : 'var(--negative)',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 52 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: up ? 'var(--positive)' : 'var(--negative)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {up ? '+' : ''}
          {formatNumber(delta)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(quantity)}건
        </div>
      </div>
    </div>
  );
}

/** 피자 베스트/워스트 순위 행. bestMax는 바 너비 계산에 사용. */
function RankRow({ m, accent, valueColor, bestMax }) {
  const row = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  const name = asDisplayText(row.name, '—');
  const quantity = safeQuantity(row.quantity);
  const rank = asFiniteNumber(row.rank, 0) ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{ height: 5, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${safePercentWidth(quantity, bestMax)}%`,
              height: '100%',
              background: accent,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 52 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: valueColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatNumber(quantity)}건
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>
          전체 {rank}위
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [periodMode, setPeriodMode] = useState('month');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [scope, setScope] = useState('all');
  const [viewMode, setViewMode] = useState('rank');
  const [cmpYear, setCmpYear] = useState(null);
  const [cmpMonth, setCmpMonth] = useState(null);
  const [opts, setOpts] = useState({
    summary: true,
    catShare: true,
    pizzaMover: true,
    rankTable: true,
    catBar: true,
    prevComp: true,
    variant: false,
    excluded: true,
  });
  const upd = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  // raw data
  const [salesRows, setSalesRows] = useState([]);
  const [excludedList, setExcludedList] = useState([]);
  const [availYears, setAvailYears] = useState([]);
  const [availMonthsByYear, setAvailMonthsByYear] = useState({});

  // computed (compare mode still uses state since it's async)
  const [compareData, setCompareData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(normalizePeriodMode(draft.periodMode));
    if (draft.year) setYear(safeYear(draft.year));
    if (draft.month) setMonth(safeMonth(draft.month));
    if (draft.scope) setScope(normalizeScope(draft.scope));
    if (draft.opts && typeof draft.opts === 'object' && !Array.isArray(draft.opts)) {
      setOpts(o => ({ ...o, ...draft.opts }));
    }
  });

  // Effect 1: mount — load raw rows, detect available periods
  useEffect(() => {
    let ignore = false;

    initDB()
      .then(async () => {
        try {
          const [rows, excluded, rules] = await Promise.all([
            getAll('sales_rows'),
            getUserExcluded(),
            getUserRules(),
          ]);
          if (ignore) return;

          const safeRows = asObjectArray(rows);
          const safeExcluded = asObjectArray(excluded);
          const safeRules = asObjectArray(rules);

          // ref_excluded + sales_rules 중 category='품목제외' 합산 후 중복 제거
          const excludedNames = new Set();
          safeExcluded.forEach(e => {
            const name = asDisplayText(e.menuName);
            if (name) excludedNames.add(name);
          });
          safeRules
            .filter(r => asDisplayText(r.category) === '품목제외' && r.enable !== false)
            .forEach(r => {
              const name = asDisplayText(r.rawMenuName);
              if (name) excludedNames.add(name);
            });
          setExcludedList([...excludedNames].sort((a, b) => a.localeCompare(b, 'ko')));
          const byYear = {};
          for (const r of safeRows) {
            const y = safeYear(r.year, 0);
            const m = safeMonth(r.month, 0);
            if (!y || !m) continue;
            if (!byYear[y]) byYear[y] = new Set();
            byYear[y].add(m);
          }
          const years = Object.keys(byYear)
            .map(Number)
            .sort((a, b) => b - a);
          const byYearArr = {};
          for (const y of years) byYearArr[y] = [...byYear[y]].sort((a, b) => a - b);
          setAvailYears(years);
          setAvailMonthsByYear(byYearArr);
          setSalesRows(safeRows);

          if (years.length > 0) {
            const latestY = years[0];
            const latestM = byYearArr[latestY].at(-1);
            setYear(latestY);
            setMonth(latestM);
            setCmpYear(latestM === 1 ? latestY - 1 : latestY);
            setCmpMonth(latestM === 1 ? 12 : latestM - 1);
          } else {
            // 데이터 없음 — Effect 2는 salesRows.length === 0 이면 early return 하므로 여기서 해제
            setIsLoading(false);
          }
        } catch (err) {
          if (ignore) return;

          console.error('[sales report]', err);
          setDataError('판매 데이터를 불러오는 중 오류가 발생했어요.');
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;

        setDataError('데이터베이스에 연결할 수 없어요. 데이터를 먼저 업로드해 주세요.');
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const safePeriodMode = normalizePeriodMode(periodMode);
  const safeYearValue = safeYear(year);
  const safeMonthValue = safeMonth(month);
  const safeScope = normalizeScope(scope);
  const safeViewMode = normalizeViewMode(viewMode);
  const safeCmpYear = safeYear(cmpYear, 0);
  const safeCmpMonth = safeMonth(cmpMonth, 0);
  const safeExcludedList = Array.isArray(excludedList)
    ? excludedList.map(item => asDisplayText(item)).filter(Boolean)
    : [];

  // Normalise raw rows once — shared by stats memo and compare effect
  const normRows = useMemo(
    () =>
      asObjectArray(salesRows).map(r => ({
        ...r,
        year: safeYear(r.year, 0),
        month: safeMonth(r.month, 0),
        quantity: safeQuantity(r.quantity),
      })),
    [salesRows]
  );

  // Computed: stats derived from salesRows + filters (useMemo avoids re-running on unrelated state changes)
  const { catShares, groupRanking, kpi } = useMemo(() => {
    if (normRows.length === 0) return { catShares: [], groupRanking: [], kpi: null };

    const period = { year: safeYearValue, month: safeMonthValue };
    const prevPeriod = {
      year: safeMonthValue === 1 ? safeYearValue - 1 : safeYearValue,
      month: safeMonthValue === 1 ? 12 : safeMonthValue - 1,
    };

    const scopeFilter = r => safeScope === 'all' || r.category === safeScope;

    // Category shares
    const catMap = new Map();
    for (const r of normRows) {
      if (r.status !== 'classified') continue;
      if (r.year !== safeYearValue || r.month !== safeMonthValue) continue;
      if (!scopeFilter(r)) continue;
      const cat = asDisplayText(r.category, '미분류') || '미분류';
      catMap.set(cat, (catMap.get(cat) || 0) + safeQuantity(r.quantity));
    }
    const cs = Array.from(catMap, ([name, value], i) => ({
      name,
      value,
      color: CAT_COLORS[i % CAT_COLORS.length],
    }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    // Group ranking for current period (uses buildGroupRanking for sizes)
    const scopedRows =
      safeScope === 'all' ? normRows : normRows.filter(r => r.category === safeScope);
    const ranking = buildGroupRanking(scopedRows, period);

    // Previous month ranking for delta
    const prevRanking = buildGroupRanking(scopedRows, prevPeriod);
    const prevMap = new Map(prevRanking.map(m => [m.name, m.quantity]));

    const withDelta = ranking.map((m, i) => {
      const prevQty = prevMap.get(m.name) || 0;
      const delta = m.quantity - prevQty;
      const deltaPct = prevQty === 0 ? null : (delta / prevQty) * 100;
      return { ...m, rank: i + 1, prevQty, delta, deltaPct };
    });

    // KPI
    const total = ranking.reduce((s, m) => s + m.quantity, 0);
    const prevTotal = prevRanking.reduce((s, m) => s + m.quantity, 0);
    const deltaPct = prevTotal === 0 ? null : ((total - prevTotal) / prevTotal) * 100;

    return {
      catShares: cs,
      groupRanking: withDelta,
      kpi: { current: total, previous: prevTotal, deltaPct },
    };
  }, [normRows, safeYearValue, safeMonthValue, safeScope]);

  // Clear loading once salesRows arrives (success path)
  useEffect(() => {
    if (normRows.length > 0) {
      setDataError(null);
      setIsLoading(false);
    }
  }, [normRows]);

  // Effect 3: compare mode — deferred via setTimeout(0) to avoid blocking the event loop
  useEffect(() => {
    if (safeViewMode !== 'compare' || normRows.length === 0 || !safeCmpYear || !safeCmpMonth) {
      setCompareData(null);
      return;
    }
    const id = setTimeout(() => {
      const result = buildPeriodCompare(
        normRows,
        { year: safeYearValue, month: safeMonthValue },
        { year: safeCmpYear, month: safeCmpMonth },
        { groupBy: 'group', category: safeScope === 'all' ? null : safeScope, topN: 5 }
      );
      setCompareData(result);
    }, 0);
    return () => clearTimeout(id);
  }, [normRows, safeViewMode, safeYearValue, safeMonthValue, safeCmpYear, safeCmpMonth, safeScope]);

  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  const safeCompareData =
    compareData && typeof compareData === 'object' && !Array.isArray(compareData)
      ? compareData
      : null;
  const periodLabel =
    safePeriodMode === 'year' ? `${safeYearValue}년` : `${safeYearValue}년 ${safeMonthValue}월`;
  const totalShare = safeCatShares.reduce((s, c) => s + safeQuantity(c.value), 0);
  const reportMeta = {
    kind: 'sales',
    period: periodLabel,
    name: `${periodLabel} 판매량 보고서`,
    pages: 1,
    options: {
      periodMode: safePeriodMode,
      year: safeYearValue,
      month: safeMonthValue,
      scope: safeScope,
      opts: safeOpts,
    },
  };

  // Excel export — multi-sheet
  const handleExcelExport = async () => {
    const XLSX = await loadXlsx();
    const now = new Date();
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const periodPart = periodLabel.replace(
      /(\d+)년 (\d+)월/,
      (_, y, m) => `${y}년${m.padStart(2, '0')}월`
    );
    const fileName = `${asDisplayText(getActiveBrand()?.name, '7번가')}_${periodPart} 판매량보고서_${dateStr}.xlsx`;

    const wb = XLSX.utils.book_new();

    // Sheet 1: 요약
    const summaryData = [
      ['항목', '값'],
      ['기간', periodLabel],
      ['대상', safeScope === 'all' ? '전체' : safeScope === 'pizza' ? '피자' : '사이드'],
      ['총 판매량', safeQuantity(kpi?.current)],
      ['전월 판매량', safeQuantity(kpi?.previous)],
      [
        '전월 대비(%)',
        kpi?.deltaPct != null ? `${kpi.deltaPct >= 0 ? '+' : ''}${kpi.deltaPct.toFixed(1)}%` : '—',
      ],
      ['카테고리 수', safeCatShares.length],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), '요약');

    // Sheet 2: 카테고리별 비중
    const catData = [
      ['카테고리', '판매량', '비중(%)'],
      ...safeCatShares.map(c => [
        asDisplayText(c.name, '미분류'),
        safeQuantity(c.value),
        totalShare > 0 ? ((safeQuantity(c.value) / totalShare) * 100).toFixed(1) : '0',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catData), '카테고리별 비중');

    // Sheet 3: 전체 메뉴 순위
    const rankHeaders = ['순위', '메뉴명', '카테고리', '판매량'];
    if (safeOpts.prevComp) rankHeaders.push('전월', '증감', '증감(%)');
    if (safeOpts.variant) rankHeaders.push('L판매', 'R판매', '기타');
    const rankData = [
      rankHeaders,
      ...safeGroupRanking.map(m => {
        const row = [
          asFiniteNumber(m.rank, 0) ?? 0,
          asDisplayText(m.name, '—'),
          asDisplayText(m.category),
          safeQuantity(m.quantity),
        ];
        if (safeOpts.prevComp) {
          row.push(
            safeQuantity(m.prevQty),
            safeQuantity(m.delta),
            m.deltaPct != null ? `${m.deltaPct >= 0 ? '+' : ''}${m.deltaPct.toFixed(1)}%` : '—'
          );
        }
        if (safeOpts.variant) {
          const sizes = asObjectArray(m.sizes);
          const L = sizes.find(s => s.size === 'L')?.quantity || 0;
          const R = sizes.find(s => s.size === 'R')?.quantity || 0;
          const etc = safeQuantity(m.quantity) - safeQuantity(L) - safeQuantity(R);
          row.push(L, R, etc > 0 ? etc : 0);
        }
        return row;
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rankData), '전체 메뉴 순위');

    // Sheet per category
    const categories = [
      ...new Set(safeGroupRanking.map(m => asDisplayText(m.category)).filter(Boolean)),
    ];
    for (const cat of categories) {
      const items = safeGroupRanking.filter(m => asDisplayText(m.category) === cat);
      const sheetData = [
        ['순위', '메뉴명', '판매량', ...(safeOpts.prevComp ? ['전월', '증감'] : [])],
        ...items.map((m, i) => [
          i + 1,
          asDisplayText(m.name, '—'),
          safeQuantity(m.quantity),
          ...(safeOpts.prevComp ? [safeQuantity(m.prevQty), safeQuantity(m.delta)] : []),
        ]),
      ];
      const sheetName = cat.slice(0, 31); // Excel sheet name max 31 chars
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), sheetName);
    }

    XLSX.writeFile(wb, fileName);
  };

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '판매량 보고서']}
      title="판매량 보고서 생성"
      sub="기간·범위·표시 항목을 선택하면 미리보기가 즉시 갱신돼요."
      kind="sales"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      options={
        <SalesReportControls
          year={safeYearValue}
          month={safeMonthValue}
          scope={safeScope}
          viewMode={safeViewMode}
          periodMode={safePeriodMode}
          availYears={availYears}
          availMonthsByYear={availMonthsByYear}
          onYear={value => setYear(safeYear(value, safeYearValue))}
          onMonth={value => setMonth(safeMonth(value, safeMonthValue))}
          onScope={value => setScope(normalizeScope(value))}
          onViewMode={value => setViewMode(normalizeViewMode(value))}
          onPeriodMode={value => setPeriodMode(normalizePeriodMode(value))}
          cmpYear={safeCmpYear || safeYearValue}
          cmpMonth={safeCmpMonth || safeMonthValue}
          onCmpYear={value => setCmpYear(safeYear(value, safeCmpYear || safeYearValue))}
          onCmpMonth={value => setCmpMonth(safeMonth(value, safeCmpMonth || safeMonthValue))}
          opts={safeOpts}
          upd={upd}
          docFormat={docFormat}
          updFmt={updFmt}
        />
      }
      preview={
        <>
          {/* ── 헤더 ── */}
          <div className="paper-head">
            <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
            <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
            <div className="paper-meta">
              <span>
                대상:{' '}
                {safeScope === 'all' ? '전체 메뉴' : safeScope === 'pizza' ? '피자' : '사이드'}
              </span>
              <span>·</span>
              <span>
                {safeViewMode === 'compare'
                  ? `비교: ${safeCmpYear || safeYearValue}년 ${safeCmpMonth || safeMonthValue}월`
                  : '해당 월 순위'}
              </span>
              <span>·</span>
              <span className="mono">
                생성일 {todayLabel} · {getProfile().name}
              </span>
            </div>
          </div>

          {/* ── 요약 통계 ── */}
          {safeOpts.summary && (
            <SalesKpiCards kpi={kpi} catShares={safeCatShares} groupRanking={safeGroupRanking} />
          )}

          {/* ── 카테고리 비중 ── */}
          {safeOpts.catShare && safeCatShares.length > 0 && (
            <div className="paper-section">
              <div className="paper-section-title">카테고리별 판매 비중</div>
              <div className="share-stack" style={{ marginTop: 10 }}>
                {safeCatShares.map(c => (
                  <div
                    key={asDisplayText(c.name, '미분류')}
                    className="share-seg"
                    style={{ flex: safeQuantity(c.value), background: c.color }}
                    title={`${asDisplayText(c.name, '미분류')} ${
                      totalShare > 0 ? ((safeQuantity(c.value) / totalShare) * 100).toFixed(1) : 0
                    }%`}
                  />
                ))}
              </div>
              <div className="paper-legend">
                {safeCatShares.map(c => (
                  <div className="paper-legend-item" key={asDisplayText(c.name, '미분류')}>
                    <span className="dot" style={{ background: c.color }} />
                    <span>{asDisplayText(c.name, '미분류')}</span>
                    <span className="num muted">{formatNumber(safeQuantity(c.value))}건</span>
                    <span
                      className="num"
                      style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}
                    >
                      {totalShare > 0 ? ((safeQuantity(c.value) / totalShare) * 100).toFixed(1) : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 피자 전월 대비 상승 / 하락 TOP 5 + 베스트/워스트 ── */}
          {safeOpts.pizzaMover &&
            safeViewMode === 'rank' &&
            (() => {
              const all = safeGroupRanking.filter(
                m => m.category?.includes('피자') && !m.category?.includes('1인피자')
              );
              if (all.length === 0) return null;
              const pizzaColor =
                safeCatShares.find(c => asDisplayText(c.name).includes('피자'))?.color || '#E1101F';

              // 전월 데이터가 있는 항목만 전월 대비에 사용
              const pizzaItems = all.filter(m => m.prevQty > 0);
              const risers = [...pizzaItems].sort((a, b) => b.delta - a.delta).slice(0, 5);
              const fallers = [...pizzaItems].sort((a, b) => a.delta - b.delta).slice(0, 5);
              const maxAbs = Math.max(...pizzaItems.map(m => Math.abs(m.delta)), 1);

              const n = Math.min(5, Math.floor(all.length / 2));
              const best = all.slice(0, n);
              const worst = all.slice(-n).reverse();
              const bestMax = safeQuantity(best[0]?.quantity) || 1;

              return (
                <div className="paper-section">
                  <div
                    className="paper-section-title"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: pizzaColor,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    피자 전월 대비 상승 / 하락 TOP 5
                  </div>

                  {pizzaItems.length > 0 ? (
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--positive)',
                            marginBottom: 6,
                          }}
                        >
                          ▲ 상승 TOP 5
                        </div>
                        {risers.map(m => (
                          <MoverRow key={m.name} m={m} up maxAbs={maxAbs} />
                        ))}
                      </div>
                      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--negative)',
                            marginBottom: 6,
                          }}
                        >
                          ▼ 하락 TOP 5
                        </div>
                        {fallers.map(m => (
                          <MoverRow key={m.name} m={m} up={false} maxAbs={maxAbs} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>
                      전월 데이터가 없어 전월 대비를 표시할 수 없습니다.
                    </div>
                  )}

                  {/* 베스트 / 워스트 — 전월 데이터 유무와 무관하게 항상 표시 */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: pizzaColor,
                            marginBottom: 6,
                          }}
                        >
                          ▲ 베스트 5
                        </div>
                        {best.map(m => (
                          <RankRow
                            key={m.name}
                            m={m}
                            accent={pizzaColor}
                            valueColor={pizzaColor}
                            bestMax={bestMax}
                          />
                        ))}
                      </div>
                      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            marginBottom: 6,
                          }}
                        >
                          ▼ 워스트 5
                        </div>
                        {worst.map(m => (
                          <RankRow
                            key={m.name}
                            m={m}
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
            })()}

          {/* ── 카테고리별 순위표 ── */}
          {safeOpts.rankTable &&
            safeViewMode === 'rank' &&
            (() => {
              if (safeGroupRanking.length === 0)
                return (
                  <div className="paper-section">
                    <div
                      style={{
                        height: 60,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--text-4)',
                        fontSize: 13,
                      }}
                    >
                      데이터 없음
                    </div>
                  </div>
                );
              const catOrder = safeCatShares.map(c => asDisplayText(c.name, '미분류'));
              const grouped = {};
              for (const m of safeGroupRanking) {
                const cat = asDisplayText(m.category, '미분류') || '미분류';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(m);
              }
              const cats = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
                c => grouped[c]
              );
              return cats.map(cat => {
                const items = grouped[cat];
                const catColor =
                  safeCatShares.find(c => asDisplayText(c.name) === cat)?.color || '#6B7280';
                const catTotal = items.reduce((s, m) => s + safeQuantity(m.quantity), 0);
                return (
                  <div className="paper-section paper-cat-section" key={cat}>
                    <div
                      className="paper-section-title"
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: catColor,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {cat} 순위 — {periodLabel}
                      <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                        합계 {formatNumber(catTotal)}건
                      </span>
                    </div>

                    {/* 카테고리 내 메뉴별 비중 바 차트 */}
                    {safeOpts.catBar && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                          margin: '10px 0 14px',
                        }}
                      >
                        {items.map((m, i) => {
                          const quantity = safeQuantity(m.quantity);
                          const pct = catTotal > 0 ? (quantity / catTotal) * 100 : 0;
                          return (
                            <div
                              key={m.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 11,
                              }}
                            >
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: catColor,
                                  flexShrink: 0,
                                  opacity: 0.5 + 0.5 * (1 - i / items.length),
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
                                  fontWeight: i === 0 ? 700 : 400,
                                }}
                              >
                                {asDisplayText(m.name, '—')}
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
                                    opacity: 0.55 + 0.45 * (1 - i / items.length),
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
                    )}

                    <table className="paper-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>#</th>
                          <th>메뉴명 (중분류)</th>
                          <th style={{ width: 90, textAlign: 'right' }}>판매량</th>
                          {safeOpts.prevComp && (
                            <th style={{ width: 80, textAlign: 'right' }}>전월</th>
                          )}
                          {safeOpts.prevComp && (
                            <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((m, i) => (
                          <Fragment key={m.name}>
                            <tr>
                              <td className="num">{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{asDisplayText(m.name, '—')}</td>
                              <td className="num right">
                                {formatNumber(safeQuantity(m.quantity))}
                              </td>
                              {safeOpts.prevComp && (
                                <td className="num right muted">
                                  {safeQuantity(m.prevQty) > 0
                                    ? formatNumber(safeQuantity(m.prevQty))
                                    : '—'}
                                </td>
                              )}
                              {safeOpts.prevComp && (
                                <td
                                  className="num right"
                                  style={{
                                    color:
                                      safeQuantity(m.delta) > 0
                                        ? 'var(--positive)'
                                        : safeQuantity(m.delta) < 0
                                          ? 'var(--negative)'
                                          : 'inherit',
                                  }}
                                >
                                  {safeQuantity(m.delta) !== 0
                                    ? `${safeQuantity(m.delta) > 0 ? '+' : ''}${formatNumber(safeQuantity(m.delta))}`
                                    : '—'}
                                </td>
                              )}
                            </tr>
                            {safeOpts.variant &&
                              asObjectArray(m.sizes).map(s => (
                                <tr
                                  key={`${asDisplayText(m.name, '—')}-${asDisplayText(s.size, '기타')}`}
                                  style={{ background: 'var(--surface-2)' }}
                                >
                                  <td />
                                  <td className="muted" style={{ fontSize: 11, paddingLeft: 20 }}>
                                    └ {asDisplayText(s.size, '기타')}
                                  </td>
                                  <td className="num right muted" style={{ fontSize: 11 }}>
                                    {formatNumber(safeQuantity(s.quantity))}
                                  </td>
                                  {safeOpts.prevComp && <td />}
                                  {safeOpts.prevComp && <td />}
                                </tr>
                              ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()}

          {/* ── 비교 모드 카테고리별 순위표 ── */}
          {safeOpts.rankTable &&
            safeViewMode === 'compare' &&
            (() => {
              if (!safeCompareData)
                return (
                  <div className="paper-section">
                    <div
                      style={{
                        height: 60,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--text-4)',
                        fontSize: 13,
                      }}
                    >
                      비교 데이터 없음
                    </div>
                  </div>
                );
              const catNameMap = new Map(
                safeGroupRanking.map(m => [
                  asDisplayText(m.name, '—'),
                  asDisplayText(m.category, '미분류') || '미분류',
                ])
              );
              const sortedRows = asObjectArray(safeCompareData.rows)
                .filter(r => !r.aIsZero)
                .sort((a, b) => safeQuantity(b.a) - safeQuantity(a.a));
              const grouped = {};
              for (const r of sortedRows) {
                const cat = catNameMap.get(asDisplayText(r.name, '—')) || '미분류';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(r);
              }
              const catOrder = safeCatShares.map(c => asDisplayText(c.name, '미분류'));
              const cats = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
                c => grouped[c]
              );
              return (
                <>
                  {cats.map(cat => {
                    const items = grouped[cat];
                    const catColor =
                      safeCatShares.find(c => asDisplayText(c.name) === cat)?.color || '#6B7280';
                    return (
                      <div className="paper-section paper-cat-section" key={cat}>
                        <div
                          className="paper-section-title"
                          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: catColor,
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                          {cat} — {periodLabel} vs {safeCmpYear || safeYearValue}년{' '}
                          {safeCmpMonth || safeMonthValue}월
                        </div>
                        <table className="paper-table">
                          <thead>
                            <tr>
                              <th style={{ width: 36 }}>#</th>
                              <th>메뉴명 (중분류)</th>
                              <th style={{ width: 90, textAlign: 'right' }}>{periodLabel}</th>
                              <th style={{ width: 90, textAlign: 'right' }}>
                                {safeCmpYear || safeYearValue}년{safeCmpMonth || safeMonthValue}월
                              </th>
                              <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                              <th style={{ width: 70, textAlign: 'right' }}>증감%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((m, i) => (
                              <tr key={asDisplayText(m.name, '—')}>
                                <td className="num">{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{asDisplayText(m.name, '—')}</td>
                                <td className="num right">{formatNumber(safeQuantity(m.a))}</td>
                                <td className="num right muted">
                                  {safeQuantity(m.b) > 0 ? formatNumber(safeQuantity(m.b)) : '—'}
                                </td>
                                <td
                                  className="num right"
                                  style={{
                                    color:
                                      safeQuantity(m.diff) > 0
                                        ? 'var(--positive)'
                                        : safeQuantity(m.diff) < 0
                                          ? 'var(--negative)'
                                          : 'inherit',
                                  }}
                                >
                                  {safeQuantity(m.diff) !== 0
                                    ? `${safeQuantity(m.diff) > 0 ? '+' : ''}${formatNumber(safeQuantity(m.diff))}`
                                    : '—'}
                                </td>
                                <td className="num right muted" style={{ fontSize: 11 }}>
                                  {asFiniteNumber(m.pct, null) != null
                                    ? `${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}%`
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
                    합계 {formatNumber(safeQuantity(safeCompareData.totalA))}건 →
                    {asFiniteNumber(safeCompareData.totalPct, null) != null
                      ? ` ${safeCompareData.totalPct >= 0 ? '+' : ''}${safeCompareData.totalPct.toFixed(1)}%`
                      : ' —'}
                    (전월 {formatNumber(safeQuantity(safeCompareData.totalB))}건)
                  </div>
                </>
              );
            })()}

          {/* ── 품목 제외 리스트 (마지막 페이지) ── */}
          {safeOpts.excluded && (
            <div className="paper-section" style={{ pageBreakBefore: 'always', marginTop: 24 }}>
              <div
                className="paper-section-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#94A3B8',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                품목 제외 리스트
                <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {safeExcludedList.length}개
                </span>
              </div>
              {safeExcludedList.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>
                  제외된 품목이 없습니다.
                </div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {safeExcludedList.map((name, i) => (
                    <div
                      key={i}
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
                          background: '#94A3B8',
                          flexShrink: 0,
                        }}
                      />
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="paper-foot">
            <span className="muted" style={{ fontSize: 11 }}>
              7번가 R&amp;D 플랫폼
            </span>
          </div>
        </>
      }
    />
  );
}
