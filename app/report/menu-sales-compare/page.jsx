'use client';
import { useState, useMemo } from 'react';
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

export default function Page() {
  const [mode, setMode] = useState('mom');
  const [scope, setScope] = useState('all');
  const [yearA, setYearA] = useState(2026);
  const [monthA, setMonthA] = useState(3);
  const [yearB, setYearB] = useState(2026);
  const [monthB, setMonthB] = useState(4);

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

  const periodA = { year: safeYearA, month: safeMonthA };
  const periodB =
    safeMode === 'custom'
      ? { year: safeYearB, month: safeMonthB }
      : deriveCompareB(periodA, safeMode);

  const availYears = useMemo(() => {
    const years = [...new Set(rows.map(r => r.year).filter(y => Number.isFinite(y)))].sort();
    return years.length > 0 ? years : [2024, 2025, 2026];
  }, [rows]);

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
    // periodA/B는 객체라 직접 나열
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, safeMode, safeScope, safeYearA, safeMonthA, safeYearB, safeMonthB]);

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
      options={
        <MenuSalesCompareOptions
          mode={safeMode}
          onMode={value => setMode(normalizeMode(value))}
          scope={safeScope}
          onScope={value => setScope(normalizeScope(value))}
          yearA={safeYearA}
          monthA={safeMonthA}
          yearB={safeYearB}
          monthB={safeMonthB}
          onYearA={value => setYearA(safeYear(value, safeYearA))}
          onMonthA={value => setMonthA(safeMonth(value, safeMonthA))}
          onYearB={value => setYearB(safeYear(value, safeYearB))}
          onMonthB={value => setMonthB(safeMonth(value, safeMonthB))}
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
