'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { loadXlsx } from '@/lib/excel';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import SalesReportControls from '@/components/report/SalesReportControls';
import { useReportPageState } from '@/hooks/useReportPageState';
import { getActiveBrand } from '@/lib/active-brand';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { safeRevenue } from '@/lib/sales/revenue';
import { useReportGeneratedMeta } from '@/hooks/useReportGeneratedMeta';
import {
  normalizePeriodMode,
  normalizeScope,
  safeMonth,
  safeQuantity,
  safeYear,
} from '@/lib/report/period';
import SalesReportPreview from '@/components/report/sales/SalesReportPreview';
import { exportSalesReportWorkbook } from '@/lib/report/sales-export';
import { useSalesReportData } from './useSalesReportData';
import { useSalesReportComputed } from './useSalesReportComputed';
import { normalizeViewMode } from './salesReportPageUtils';

const DRAFT_KEY = 'report_draft_sales';

function readSalesReportQuery() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  return {
    year: safeYear(params.get('year'), 0),
    month: safeMonth(params.get('month'), 0),
    viewMode: viewParam ? normalizeViewMode(viewParam) : null,
    cmpYear: safeYear(params.get('cmpYear'), 0),
    cmpMonth: safeMonth(params.get('cmpMonth'), 0),
  };
}

export default function Page() {
  const [periodMode, setPeriodMode] = useState('month');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
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
      revenue: false,
      excluded: true,
    },
    draft => {
      if (draft.periodMode) setPeriodMode(normalizePeriodMode(draft.periodMode));
      if (draft.year) setYear(safeYear(draft.year));
      if (draft.month) setMonth(safeMonth(draft.month));
      if (draft.scope) setScope(normalizeScope(draft.scope));
    }
  );

  const {
    salesRows,
    excludedList,
    availYears,
    availMonthsByYear,
    defaultPeriod,
    dataError,
    isLoading,
    reload,
  } = useSalesReportData();
  const { compactDateLabel, profileName } = useReportGeneratedMeta();
  const defaultApplied = useRef(false);
  const queryAppliedRef = useRef(false);

  useEffect(() => {
    if (queryAppliedRef.current) return;
    const query = readSalesReportQuery();
    if (!query.year && !query.month && !query.viewMode && !query.cmpYear && !query.cmpMonth) return;
    queryAppliedRef.current = true;
    if (query.year && query.month) {
      defaultApplied.current = true;
      setPeriodMode('month');
      setYear(query.year);
      setMonth(query.month);
      const prevMonth = query.month === 1 ? 12 : query.month - 1;
      const prevYear = query.month === 1 ? query.year - 1 : query.year;
      setCmpYear(prevYear);
      setCmpMonth(prevMonth);
    }
    if (query.viewMode) setViewMode(query.viewMode);
    if (query.viewMode === 'compare' && query.cmpYear && query.cmpMonth) {
      setCmpYear(query.cmpYear);
      setCmpMonth(query.cmpMonth);
    }
  }, []);

  // Apply defaultPeriod once when data first arrives
  useEffect(() => {
    if (!defaultPeriod || defaultApplied.current) return;
    defaultApplied.current = true;
    setYear(defaultPeriod.year);
    setMonth(defaultPeriod.month);
    setCmpYear(defaultPeriod.cmpYear);
    setCmpMonth(defaultPeriod.cmpMonth);
  }, [defaultPeriod]);

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

  // Normalise raw rows once — shared by stats and compare
  const normRows = useMemo(
    () =>
      asObjectArray(salesRows).map(r => ({
        ...r,
        year: safeYear(r.year, 0),
        month: safeMonth(r.month, 0),
        quantity: safeQuantity(r.quantity),
        revenue: safeRevenue(r.revenue ?? r.amount ?? r.salesAmount ?? r.totalAmount),
      })),
    [salesRows]
  );

  const { catShares, groupRanking, kpi, compareData } = useSalesReportComputed({
    normRows,
    safeViewMode,
    safeYearValue,
    safeMonthValue,
    safeCmpYear,
    safeCmpMonth,
    safeScope,
  });

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

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '판매량 보고서']}
      title="판매량 보고서 생성"
      sub="기간·범위·표시 항목을 선택하면 미리보기가 즉시 갱신돼요."
      kind="sales"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={reload}
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
          todayLabel={compactDateLabel}
          profileName={profileName}
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
