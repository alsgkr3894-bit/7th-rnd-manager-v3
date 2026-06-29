'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { MenuSalesCompareOptions } from '@/components/report/compare/MenuSalesCompareOptions';
import { MenuSalesComparePreview } from '@/components/report/compare/MenuSalesComparePreview';
import { buildPeriodCompare, deriveCompareB } from '@/lib/sales/compare';
import { buildCompareSeries } from '@/lib/report/build-compare-report';
import { safeAll } from '@/lib/stats/_helpers';
import { useReportPageState } from '@/hooks/useReportPageState';
import { useDBLoad } from '@/hooks/useDBLoad';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { normalizeScope, safeMonth, safeYear } from '@/lib/report/period';

const DRAFT_KEY = 'report_draft_compare';

function normalizeMode(value) {
  return ['mom', 'yoy', 'custom'].includes(value) ? value : 'mom';
}

function safePeriodFromRow(row) {
  const year = safeYear(row?.year, 0);
  const month = safeMonth(row?.month, 0);
  if (year < 1900 || month < 1) return null;
  return { year, month };
}

function periodKey(period) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function periodExists(periods, period) {
  return periods.some(item => item.year === period.year && item.month === period.month);
}

export default function Page() {
  const [mode, setMode] = useState('mom');
  const [scope, setScope] = useState('all');
  const [yearA, setYearA] = useState(2026);
  const [monthA, setMonthA] = useState(3);
  const [yearB, setYearB] = useState(2026);
  const [monthB, setMonthB] = useState(4);
  const restoredPeriodRef = useRef(false);
  const autoPeriodReadyRef = useRef(false);
  const periodManuallyEditedRef = useRef(false);

  const {
    opts,
    setOpts,
    updOpts: upd,
  } = useReportPageState(
    DRAFT_KEY,
    { summary: true, catCompare: true, rankShift: true, chart: true, winners: true },
    draft => {
      if (draft.mode) setMode(normalizeMode(draft.mode));
      if (draft.scope) setScope(normalizeScope(draft.scope));
      if (draft.yearA || draft.monthA || draft.yearB || draft.monthB) {
        restoredPeriodRef.current = true;
      }
      if (draft.yearA) setYearA(safeYear(draft.yearA));
      if (draft.monthA) setMonthA(safeMonth(draft.monthA));
      if (draft.yearB) setYearB(safeYear(draft.yearB));
      if (draft.monthB) setMonthB(safeMonth(draft.monthB));
    }
  );

  // rows는 DB에서 1회 로드. 기간·범위 변경은 DB 재조회 없이 useMemo로 파생.
  const {
    data: rows = [],
    loading: isLoading,
    error,
    reload,
  } = useDBLoad(() => safeAll('sales_rows').then(asObjectArray), {
    initialData: [],
    onError: err => console.error('[compare report]', err),
  });

  const safeMode = normalizeMode(mode);
  const safeScope = normalizeScope(scope);
  const safeYearA = safeYear(yearA);
  const safeMonthA = safeMonth(monthA);
  const safeYearB = safeYear(yearB);
  const safeMonthB = safeMonth(monthB);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};

  const periodA = useMemo(
    () => ({ year: safeYearA, month: safeMonthA }),
    [safeYearA, safeMonthA]
  );
  const periodB = useMemo(
    () =>
      safeMode === 'custom'
        ? { year: safeYearB, month: safeMonthB }
        : deriveCompareB(periodA, safeMode),
    [periodA, safeMode, safeYearB, safeMonthB]
  );

  const availablePeriods = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const period = safePeriodFromRow(row);
      if (!period) continue;
      map.set(periodKey(period), period);
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [rows]);

  const availYears = useMemo(() => {
    const years = [...new Set(availablePeriods.map(period => period.year))].sort();
    return years.length > 0 ? years : [2024, 2025, 2026];
  }, [availablePeriods]);

  useEffect(() => {
    if (
      isLoading ||
      autoPeriodReadyRef.current ||
      periodManuallyEditedRef.current ||
      availablePeriods.length === 0
    ) {
      return;
    }

    const latest = availablePeriods[0];
    const currentExists = periodExists(availablePeriods, periodA);
    if (!restoredPeriodRef.current || !currentExists) {
      setYearA(latest.year);
      setMonthA(latest.month);

      const fallbackB = availablePeriods[1] || deriveCompareB(latest, safeMode);
      setYearB(fallbackB.year);
      setMonthB(fallbackB.month);
    }
    autoPeriodReadyRef.current = true;
  }, [availablePeriods, isLoading, periodA, safeMode]);

  const updateMode = value => {
    const nextMode = normalizeMode(value);
    setMode(nextMode);
    if (nextMode !== 'custom') {
      const nextPeriodB = deriveCompareB(periodA, nextMode);
      setYearB(nextPeriodB.year);
      setMonthB(nextPeriodB.month);
    }
  };
  const updateScope = value => setScope(normalizeScope(value));
  const updateYearA = value => {
    periodManuallyEditedRef.current = true;
    setYearA(safeYear(value, safeYearA));
  };
  const updateMonthA = value => {
    periodManuallyEditedRef.current = true;
    setMonthA(safeMonth(value, safeMonthA));
  };
  const updateYearB = value => {
    periodManuallyEditedRef.current = true;
    setYearB(safeYear(value, safeYearB));
  };
  const updateMonthB = value => {
    periodManuallyEditedRef.current = true;
    setMonthB(safeMonth(value, safeMonthB));
  };

  const { compareResult, series } = useMemo(() => {
    if (rows.length === 0) return { compareResult: null, series: [] };
    try {
      return {
        compareResult: buildPeriodCompare(rows, periodA, periodB, {
          groupBy: 'group',
          category: safeScope === 'all' ? null : safeScope,
          topN: 6,
        }),
        series: buildCompareSeries(rows, periodA, periodB, safeScope, safeMonthA),
      };
    } catch (err) {
      console.error('[compare report] 집계 실패', err);
      return { compareResult: null, series: [] };
    }
  }, [periodA, periodB, rows, safeMonthA, safeScope]);

  const dataError = error
    ? '데이터베이스에 연결할 수 없어요. 판매 데이터를 먼저 업로드해 주세요.'
    : !isLoading && rows.length === 0
      ? '판매 데이터가 없어요. 판매량 파일을 먼저 업로드해 주세요.'
      : null;

  const periodALabel = `${safeYearA}.${String(safeMonthA).padStart(2, '0')}`;
  const periodBLabel = `${periodB.year}.${String(periodB.month).padStart(2, '0')}`;
  const reportMeta = {
    period: `${periodALabel} vs ${periodBLabel}`,
    name: `판매량 비교 보고서 — ${periodALabel} vs ${periodBLabel}`,
    pages: 7,
    options: {
      mode: safeMode,
      scope: safeScope,
      yearA: safeYearA,
      monthA: safeMonthA,
      yearB: safeYearB,
      monthB: safeMonthB,
      opts: safeOpts,
    },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '판매량 비교 보고서']}
      title="판매량 비교 보고서 생성"
      sub="두 기간을 나란히 — 메뉴별 순위 이동·증감을 한눈에."
      kind="compare"
      exportNote="비교 모드를 바꾸면 A·B 기간 라벨이 자동으로 갱신돼요."
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={error ? reload : undefined}
      options={
        <MenuSalesCompareOptions
          mode={safeMode}
          onMode={updateMode}
          scope={safeScope}
          onScope={updateScope}
          yearA={safeYearA}
          monthA={safeMonthA}
          yearB={safeYearB}
          monthB={safeMonthB}
          onYearA={updateYearA}
          onMonthA={updateMonthA}
          onYearB={updateYearB}
          onMonthB={updateMonthB}
          availableYears={availYears}
          opts={safeOpts}
          onOptionChange={upd}
        />
      }
      preview={
        <MenuSalesComparePreview
          mode={safeMode}
          scope={safeScope}
          opts={safeOpts}
          periodALabel={periodALabel}
          periodBLabel={periodBLabel}
          monthA={safeMonthA}
          periodB={periodB}
          compareResult={compareResult}
          series={series}
        />
      }
    />
  );
}
