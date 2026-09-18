'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { ReportModeSwitch } from '@/components/report/ReportModeSwitch';
import { CostReportOptions } from '@/components/report/cost/CostReportOptions';
import { CostReportPreview } from '@/components/report/cost/CostReportPreview';
import { MarginReportBuilderContent } from '@/components/report/margin/MarginReportBuilderContent';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { showToast } from '@/components/Toast';
import { exportCostXlsx } from '@/lib/report/export-cost-xlsx';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { useReportPageState } from '@/hooks/useReportPageState';
import {
  buildCostReportData,
  buildRecipePrintMenus,
  buildRecipePrintRows,
} from '@/lib/report/build-cost-report';
import {
  buildRecipeMenuGroups,
  buildRecipePrintSections,
  filterRecipePrintMenus,
  filterRecipePrintRows,
  pruneRecipeSelection,
} from '@/lib/report/recipe-print-selection';
import { useSettingValue } from '@/hooks/useSettingValue';
import { buildStrictPostingMessage, collectStrictPostingIssues } from '@/lib/report/strict-posting';

// ── 상수 ──────────────────────────────────────────────────────
// 카테고리 순서: 원가마진표(app/cost/margin/marginTableSections.js CATEGORY_SECTIONS)와 동일
const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지', '추가토핑'];

const CAT_META = {
  피자: { id: 'pizza', color: '#3182F6', label: '피자' },
  '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
  세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
  사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
  엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
  추가토핑: { id: 'topping', color: '#14B8A6', label: '추가토핑' },
};

const DRAFT_KEY = 'report_draft_cost';

// ── 메인 컴포넌트 ──────────────────────────────────────────────
const PERIOD_LABEL = '현재 원가 기준';

function readReportModeFromLocation() {
  if (typeof window === 'undefined') return 'cost';
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'margin' ? 'margin' : 'cost';
}

function setReportModeUrl(mode) {
  if (typeof window === 'undefined') return;
  const nextUrl = mode === 'margin' ? '/report/cost?mode=margin' : '/report/cost';
  window.history.replaceState(null, '', nextUrl);
}

export default function Page() {
  const [reportMode, setReportMode] = useState('cost');

  useEffect(() => {
    setReportMode(readReportModeFromLocation());
  }, []);

  const handleReportModeChange = mode => {
    const nextMode = mode === 'margin' ? 'margin' : 'cost';
    setReportMode(nextMode);
    setReportModeUrl(nextMode);
  };

  if (reportMode === 'margin') {
    return <MarginReportBuilderContent onReportModeChange={handleReportModeChange} />;
  }

  return <CostReportBuilderContent onReportModeChange={handleReportModeChange} />;
}

function CostReportBuilderContent({ onReportModeChange }) {
  const [riskThreshold, setRiskThreshold] = useState(35);
  const [cats, setCats] = useState({
    pizza: true,
    personal: true,
    side: true,
    set: true,
    edge: true,
    topping: true,
  });
  const updCat = makeFieldUpdater(setCats);
  const {
    opts,
    setOpts,
    updOpts: updOpt,
    docFormat,
    setDocFormat,
    updFmt,
  } = useReportPageState(
    DRAFT_KEY,
    {
      summary: true,
      catTable: true,
      perCategory: true,
      riskList: true,
      recipeAppendix: false,
      recipePagePerMenu: true,
      recipeSelection: {},
    },
    draft => {
      if (draft.riskThreshold) setRiskThreshold(draft.riskThreshold);
      if (draft.cats) setCats(c => ({ ...c, ...draft.cats }));
    }
  );
  const [viewTab, setViewTab] = useState('report');
  const strictPostingEnabled = useSettingValue('strictPosting') === 'on';

  const {
    data,
    loading: isLoading,
    errorMessage: dataError,
    reload,
  } = useDBLoad(
    async () => {
      const [prices, ingredients, recipeMaps, edges, latestPriceLookup, recipeGroups] =
        await Promise.all([
          getAllMenuPrices(),
          getAllIngredients(),
          loadMenuRecipeMaps(),
          getAllEdges(),
          buildLatestPriceLookup(),
          getAllRecipeGroups(),
        ]);

      if (prices.length === 0) {
        throw new Error('메뉴 가격 데이터가 없어요. 원가계산 → 판매가를 먼저 등록해 주세요.');
      }

      const latestPriceRows = new Map(
        [...latestPriceLookup.entries()].map(([productCode, priceWithTax]) => [
          productCode,
          { productCode, priceWithTax },
        ])
      );
      const ctx = {
        detailMaps: recipeMaps,
        edges,
        recipeGroups,
        upm: buildUnitPriceMap(ingredients, latestPriceRows),
      };
      const recipeRows = buildRecipePrintRows({
        detailMaps: ctx.detailMaps,
        unitPriceMap: ctx.upm,
        recipeGroups: ctx.recipeGroups,
      });
      return { prices, ctx, recipeRows };
    },
    {
      initialData: null,
      keepDataOnReload: false,
      mapErrorMessage: err => err.message || '메뉴 가격 데이터를 불러오는 중 오류가 발생했어요.',
      onError: err => {
        // "메뉴 가격 없음"은 빈 DB 안내 메시지이므로 콘솔 에러 제외
        if (!err.message?.includes('메뉴 가격 데이터가 없어요')) {
          console.error('[cost report]', err);
        }
      },
    }
  );

  const recipeRows = useMemo(() => data?.recipeRows ?? [], [data?.recipeRows]);

  const costByCategory = useMemo(() => {
    if (!data?.prices || !data?.ctx) {
      return Object.fromEntries(
        Object.entries(CAT_META).map(([, m]) => [
          m.id,
          { label: m.label, color: m.color, menus: [] },
        ])
      );
    }
    return buildCostReportData(data.prices, data.ctx, CAT_KEYS, CAT_META);
  }, [data?.prices, data?.ctx]);

  const periodLabel = PERIOD_LABEL;

  const diagnostics = costByCategory._diagnostics || [];
  const strictPostingIssues = useMemo(() => collectStrictPostingIssues(recipeRows), [recipeRows]);

  // CAT_KEYS 순서 유지하면서 활성 카테고리 추출
  const activeCats = CAT_KEYS.map(k => CAT_META[k])
    .filter(m => cats[m.id])
    .map(m => [m.id, costByCategory[m.id] || { label: m.label, color: m.color, menus: [] }]);

  const catStats = activeCats.map(([k, c]) => {
    const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
    const avg = rates.length ? rates.reduce((s, v) => s + v, 0) / rates.length : 0;
    const risk = c.menus.filter(m => m.rate >= riskThreshold).length;
    return {
      id: k,
      ...c,
      avg,
      min: rates.length ? Math.min(...rates) : 0,
      max: rates.length ? Math.max(...rates) : 0,
      risk,
      count: c.menus.length,
    };
  });

  const allMenus = activeCats.flatMap(([, c]) => c.menus);
  const totalCount = allMenus.length;
  const allAvg = totalCount ? allMenus.reduce((s, m) => s + m.rate, 0) / totalCount : 0;
  const allRisk = allMenus.filter(m => m.rate >= riskThreshold).length;
  const allMaxRate = totalCount ? Math.max(...allMenus.map(m => m.rate)) : 0;
  const riskMenus = activeCats
    .flatMap(([, c]) =>
      c.menus
        .filter(m => m.rate >= riskThreshold)
        .map(m => ({ ...m, catLabel: c.label, catColor: c.color }))
    )
    .sort((a, b) => b.rate - a.rate);
  // recipeRows는 필터하지 않은 채로 둔다 — collectStrictPostingIssues(아래)가 카테고리/메뉴
  // 선택과 무관하게 "레시피에 미연동 재료가 있으면 무조건 차단"해야 하는데, 필터링된 배열을
  // 넘기면 선택에서 빠진 메뉴의 미연동 재료를 놓쳐 가드가 조용히 약해진다.
  const recipeMenus = useMemo(() => buildRecipePrintMenus(recipeRows), [recipeRows]);
  const selectedRecipeMenus = useMemo(
    () => filterRecipePrintMenus(recipeMenus, { cats, recipeSelection: opts.recipeSelection }),
    [recipeMenus, cats, opts.recipeSelection]
  );
  const recipeMenuGroups = useMemo(
    () =>
      buildRecipeMenuGroups(filterRecipePrintMenus(recipeMenus, { cats }), opts.recipeSelection),
    [recipeMenus, cats, opts.recipeSelection]
  );
  const recipeSections = useMemo(
    () =>
      buildRecipePrintSections(selectedRecipeMenus, {
        pagePerMenu: opts.recipePagePerMenu !== false,
      }),
    [selectedRecipeMenus, opts.recipePagePerMenu]
  );
  const selectedRecipeRows = useMemo(
    () => filterRecipePrintRows(recipeRows, { cats, recipeSelection: opts.recipeSelection }),
    [recipeRows, cats, opts.recipeSelection]
  );

  const updRecipeMenuChange = useCallback(
    (menuId, value) => {
      setOpts(prev => ({
        ...prev,
        recipeSelection: pruneRecipeSelection({
          ...(prev.recipeSelection || {}),
          [menuId]: value,
        }),
      }));
    },
    [setOpts]
  );
  const updRecipeGroupSelectAll = useCallback(
    (kind, value) => {
      const group = recipeMenuGroups.find(g => g.kind === kind);
      if (!group) return;
      setOpts(prev => {
        const next = { ...(prev.recipeSelection || {}) };
        for (const menu of group.menus) next[menu.id] = value;
        return { ...prev, recipeSelection: pruneRecipeSelection(next) };
      });
    },
    [recipeMenuGroups, setOpts]
  );
  const updRecipePagePerMenu = useCallback(
    value => setOpts(prev => ({ ...prev, recipePagePerMenu: value })),
    [setOpts]
  );

  // "보고서 생성"은 항상 현재 viewTab이 보여주는 .report-paper만 인쇄한다(ReportBuilderShell
  // triggerPrint). 부록은 'report' 탭에서만 렌더되므로, 레시피 탭에서 부록을 켜고 바로
  // 생성을 누르면 본문도 부록도 없이 레시피 탭 내용만 찍혀 나간다 — 부록을 켜는 순간
  // report 탭으로 되돌려 이 함정을 막는다.
  const handleOptionChange = useCallback(
    (key, value) => {
      updOpt(key, value);
      if (key === 'recipeAppendix' && value === true) setViewTab('report');
    },
    [updOpt]
  );

  const viewLabel =
    viewTab === 'costTable'
      ? '제품원가표'
      : viewTab === 'recipe'
        ? '레시피 출력'
        : '원가계산 보고서';

  const reportMeta = {
    period: periodLabel,
    name: `${periodLabel} ${viewLabel}`,
    options: {
      reportMode: 'cost',
      riskThreshold,
      cats,
      opts,
      strictPosting: strictPostingEnabled,
      strictPostingIssueCount: strictPostingIssues.length,
    },
  };

  const guardStrictPosting = useCallback(() => {
    if (!strictPostingEnabled || strictPostingIssues.length === 0) return true;
    showToast(buildStrictPostingMessage(strictPostingIssues), 'error', 7000);
    return false;
  }, [strictPostingEnabled, strictPostingIssues]);

  const handleExcelExport = () =>
    exportCostXlsx(periodLabel, activeCats, selectedRecipeRows, riskThreshold).catch(err =>
      showToast('엑셀 내보내기 실패: ' + (err?.message || '알 수 없는 오류'), 'error')
    );

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '원가 보고서', '원가계산']}
      title="원가 보고서 생성"
      sub="원가계산과 원가마진표를 한 화면에서 전환해 PDF/Excel로 출력합니다."
      kind="cost"
      exportNote={
        strictPostingEnabled && strictPostingIssues.length > 0
          ? `단가는 최신 제때 업로드 기준입니다. 미연동 재료 ${strictPostingIssues.length}건이 있어 보고서 생성이 차단됩니다.`
          : '단가는 최신 제때 업로드 기준으로 고정됩니다.'
      }
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={reload}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      onBeforeGenerate={guardStrictPosting}
      options={
        <>
          <ReportModeSwitch value="cost" onChange={onReportModeChange} />
          <CostReportOptions
            cats={cats}
            onCatChange={updCat}
            opts={opts}
            onOptionChange={handleOptionChange}
            riskThreshold={riskThreshold}
            onRiskThreshold={setRiskThreshold}
            docFormat={docFormat}
            onFormatChange={updFmt}
            recipeMenuGroups={recipeMenuGroups}
            onRecipeMenuChange={updRecipeMenuChange}
            onRecipeGroupSelectAll={updRecipeGroupSelectAll}
            onRecipePagePerMenu={updRecipePagePerMenu}
          />
        </>
      }
      preview={
        <CostReportPreview
          viewTab={viewTab}
          onViewTab={setViewTab}
          activeCats={activeCats}
          totalCount={totalCount}
          recipeSections={recipeSections}
          recipeMenuCount={selectedRecipeMenus.length}
          riskThreshold={riskThreshold}
          opts={opts}
          catStats={catStats}
          allAvg={allAvg}
          allRisk={allRisk}
          allMaxRate={allMaxRate}
          riskMenus={riskMenus}
          diagnostics={diagnostics}
          viewLabel={viewLabel}
        />
      }
    />
  );
}
