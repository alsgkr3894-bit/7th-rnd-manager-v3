'use client';
import { useState, useEffect, useMemo } from 'react';
import { loadXlsx } from '@/lib/excel';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import SalesReportControls from '@/components/report/SalesReportControls';
import { initDB } from '@/lib/db/init';
import { getAll } from '@/lib/db';
import { buildPeriodCompare } from '@/lib/sales/compare';
import { getUserExcluded, getUserRules } from '@/lib/sales';
import { useReportPageState } from '@/hooks/useReportPageState';
import { getProfile } from '@/lib/profile';
import { getActiveBrand } from '@/lib/active-brand';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  normalizePeriodMode,
  normalizeScope,
  safeMonth,
  safeQuantity,
  safeYear,
} from '@/lib/report/period';
import { buildSalesStats } from '@/lib/report/build-sales-report';
import SalesReportPreview from '@/components/report/sales/SalesReportPreview';
import { exportSalesReportWorkbook } from '@/lib/report/sales-export';

const DRAFT_KEY = 'report_draft_sales';

function normalizeViewMode(value) {
  return ['rank', 'compare'].includes(value) ? value : 'rank';
}

export default function Page() {
  const [periodMode, setPeriodMode] = useState('month');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [scope, setScope] = useState('all');
  const [viewMode, setViewMode] = useState('rank');
  const [cmpYear, setCmpYear] = useState(null);
  const [cmpMonth, setCmpMonth] = useState(null);
  const {
    opts,
    updOpts: upd,
    docFormat,
    updFmt,
  } = useReportPageState(
    DRAFT_KEY,
    {
      summary: true,
      catShare: true,
      pizzaMover: true,
      rankTable: true,
      catBar: true,
      prevComp: true,
      variant: false,
      excluded: true,
    },
    draft => {
      if (draft.periodMode) setPeriodMode(normalizePeriodMode(draft.periodMode));
      if (draft.year) setYear(safeYear(draft.year));
      if (draft.month) setMonth(safeMonth(draft.month));
      if (draft.scope) setScope(normalizeScope(draft.scope));
    }
  );

  // raw data
  const [salesRows, setSalesRows] = useState([]);
  const [excludedList, setExcludedList] = useState([]);
  const [availYears, setAvailYears] = useState([]);
  const [availMonthsByYear, setAvailMonthsByYear] = useState({});

  // computed (compare mode still uses state since it's async)
  const [compareData, setCompareData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Computed: stats derived from salesRows + filters
  const { catShares, groupRanking, kpi } = useMemo(
    () =>
      buildSalesStats(normRows, { year: safeYearValue, month: safeMonthValue, scope: safeScope }),
    [normRows, safeYearValue, safeMonthValue, safeScope]
  );

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
    exportSalesReportWorkbook(XLSX, {
      periodLabel,
      scope: safeScope,
      kpi,
      catShares: safeCatShares,
      groupRanking: safeGroupRanking,
      opts: safeOpts,
      brandName: getActiveBrand()?.name,
    });
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
        <SalesReportPreview
          periodLabel={periodLabel}
          scope={safeScope}
          viewMode={safeViewMode}
          cmpYear={safeCmpYear || safeYearValue}
          cmpMonth={safeCmpMonth || safeMonthValue}
          todayLabel={todayLabel}
          profileName={getProfile().name}
          opts={safeOpts}
          kpi={kpi}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          totalShare={totalShare}
          compareData={safeCompareData}
          excludedList={safeExcludedList}
        />
      }
    />
  );
}
