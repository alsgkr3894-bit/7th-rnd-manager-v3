'use client';
import { useState } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { PriceReportOptions } from '@/components/report/price/PriceReportOptions';
import { PriceReportPreview } from '@/components/report/price/PriceReportPreview';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';
import { buildPriceReportData } from '@/lib/report/build-price-report';
import { pickPriceReportFiles } from '@/lib/report/price-period';
import { buildPriceCostImpact } from '@/lib/report/price-cost-impact';
import { getAllIngredients } from '@/lib/ingredient';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import { buildDiscontinuedMenuCodeSet } from '@/lib/report/recipe-print-rows';
import { exportPriceReportXlsx } from '@/lib/report/price-export';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { todayLocalDate, localDateBefore } from '@/lib/date/local-date';

const DRAFT_KEY = 'report_draft_price';

function safeDateInput(value, fallback) {
  const text = asDisplayText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

export default function Page() {
  const [periodMode, setPeriodMode] = useState('week');
  // 2026-10-13: 기본은 "전체 식자재 변동 요약"만 체크 — 원가 영향 메뉴는 직접 켠다
  const [opts, setOpts] = useState({
    catSummary: true,
    costImpact: false,
  });
  const upd = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  const todayStr = todayLocalDate();
  const weekAgoStr = localDateBefore(7);
  const [customFrom, setCustomFrom] = useState(weekAgoStr);
  const [customTo, setCustomTo] = useState(todayStr);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  // 파일 선택 로직이 periodMode·날짜에 따라 다른 파일 ID를 조회하므로 deps 사용.
  // keepDataOnReload:false — 기간 변경 시 이전 기간 데이터가 잠시라도 표시되지 않도록.
  const {
    data,
    loading: isLoading,
    errorMessage: dataError,
    reload,
  } = useDBLoad(
    async () => {
      const files = asObjectArray(await getPriceFiles());
      const { latest, base } = pickPriceReportFiles(files, {
        mode: periodMode,
        from: safeDateInput(customFrom, weekAgoStr),
        to: safeDateInput(customTo, todayStr),
      });

      const dateRange = `${asDisplayText(base.updateDate, '—')} ~ ${asDisplayText(latest.updateDate, '—')}`;
      const [latestRows, baseRows] = await Promise.all([
        getPriceRowsByFileId(latest.id),
        getPriceRowsByFileId(base.id),
      ]);
      const { changes, catSummary } = buildPriceReportData(baseRows, latestRows, 0);
      const [ingredients, detailMaps, edges, recipeGroups, masters] = await Promise.all([
        getAllIngredients(),
        loadMenuRecipeMaps(),
        getAllEdges(),
        getAllRecipeGroups(),
        getAllMenuMaster(),
      ]);
      const costImpact = buildPriceCostImpact({
        baseRows,
        latestRows,
        ingredients,
        detailMaps,
        recipeGroups,
        edges,
        excludeMenuCodes: buildDiscontinuedMenuCodeSet(masters),
      });
      return { changes, catSummary, dateRange, costImpact };
    },
    {
      deps: [periodMode, customFrom, customTo, todayStr, weekAgoStr],
      keepDataOnReload: false,
      mapErrorMessage: err => err.message,
    }
  );

  const changes = data?.changes ?? [];
  const catSummary = data?.catSummary ?? [];
  const dateRange = data?.dateRange ?? '—';
  const costImpact = data?.costImpact ?? { menus: [], up: 0, down: 0 };

  const reportMeta = {
    kind: 'price',
    period: dateRange,
    name: `제때 가격 변동 보고서 (${dateRange})`,
    options: { periodMode, opts },
  };
  const handleExcelExport = () =>
    exportPriceReportXlsx({
      dateRange,
      changes,
      catSummary,
      costImpact,
      opts,
    });

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '제때 가격 보고서']}
      title="제때 가격 보고서 생성"
      sub="제때 단가 변동 — 변동된 품목을 전체 자동 추출해요."
      kind="price"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={reload}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      options={
        <PriceReportOptions
          periodMode={periodMode}
          onPeriodMode={setPeriodMode}
          customFrom={customFrom}
          onCustomFrom={setCustomFrom}
          customTo={customTo}
          onCustomTo={setCustomTo}
          todayStr={todayStr}
          weekAgoStr={weekAgoStr}
          opts={opts}
          onOptionChange={upd}
          docFormat={docFormat}
          onFormatChange={updFmt}
        />
      }
      preview={
        <PriceReportPreview
          dateRange={dateRange}
          changes={changes}
          catSummary={catSummary}
          costImpact={costImpact}
          opts={opts}
        />
      }
    />
  );
}
