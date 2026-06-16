'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { CostReportOptions } from '@/components/report/cost/CostReportOptions';
import { CostReportPreview } from '@/components/report/cost/CostReportPreview';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { withDownloadDateSuffix } from '@/lib/download';
import { loadXlsx } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db/init';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { getActiveBrand } from '@/lib/active-brand';
import { useReportPageState } from '@/hooks/useReportPageState';
import { getMenuCodeRank } from '@/lib/menu-categories';
import {
  buildCostReportData,
  buildRecipePrintMenus,
  buildRecipePrintRows,
} from '@/lib/report/build-cost-report';
import { useSettingValue } from '@/hooks/useSettingValue';
import { buildStrictPostingMessage, collectStrictPostingIssues } from '@/lib/report/strict-posting';

// ── 상수 ──────────────────────────────────────────────────────
// 카테고리 순서: 원가마진표와 동일
const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지'];

const CAT_META = {
  피자: { id: 'pizza', color: '#3182F6', label: '피자' },
  '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
  세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
  사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
  엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
};

const DRAFT_KEY = 'report_draft_cost';

async function exportCostXlsx(periodLabel, activeCats, recipeRows) {
  const XLSX = await loadXlsx();
  const periodPart = periodLabel.replace(
    /(\d+)년 (\d+)월/,
    (_, y, m) => `${y}년${m.padStart(2, '0')}월`
  );
  const wb = XLSX.utils.book_new();

  // 시트1: 카테고리 요약
  const summaryRows = [
    ['카테고리', '메뉴 수', '평균 원가율(%)', '최저(%)', '최고(%)', '위험 메뉴'],
    ...activeCats.map(([, c]) => {
      const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
      const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      return [
        c.label,
        c.menus.length,
        avg > 0 ? Math.round(avg * 10) / 10 : '',
        rates.length ? Math.round(Math.min(...rates) * 10) / 10 : '',
        rates.length ? Math.round(Math.max(...rates) * 10) / 10 : '',
        c.menus.filter(m => m.rate > 0).length,
      ];
    }),
  ];
  const sheet1 = XLSX.utils.aoa_to_sheet(summaryRows);
  sheet1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, sheet1, '카테고리 요약');

  // 시트2: 메뉴 상세 (카테고리 내 menuCode 오름차순)
  const detailRows = [
    ['카테고리', '메뉴명', '판매가(원)', '원가(원)', '원가율(%)'],
    ...activeCats.flatMap(([, c]) =>
      [...c.menus]
        .sort(
          (a, b) =>
            getMenuCodeRank(a.code) - getMenuCodeRank(b.code) ||
            (a.code || '').localeCompare(b.code || '', 'ko')
        )
        .map(m => [
          c.label,
          m.name,
          m.sale || '',
          m.cost || '',
          m.rate > 0 ? Math.round(m.rate * 10) / 10 : '',
        ])
    ),
  ];
  const sheet2 = XLSX.utils.aoa_to_sheet(detailRows);
  sheet2['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, sheet2, '메뉴 상세');

  // 시트3: 레시피 출력
  const recipeSheetRows = [
    [
      '카테고리',
      '메뉴코드',
      '메뉴명',
      '규격',
      '원가식자재',
      '제품코드',
      '수량',
      '단위',
      '단가(원)',
      '소계(원)',
      '레시피합계(원)',
      '비고',
    ],
    ...(Array.isArray(recipeRows) ? recipeRows : []).flatMap(row => {
      const components = Array.isArray(row.components) ? row.components : [];
      if (!components.length) {
        return [
          [
            row.categoryLabel,
            row.menuCode,
            row.menuName,
            row.size,
            '구성품 미작성',
            '',
            '',
            '',
            '',
            '',
            '',
            row.note || '',
          ],
        ];
      }
      return components.map((component, index) => [
        row.categoryLabel,
        row.menuCode,
        row.menuName,
        row.size,
        component.ingredientName,
        component.productCode,
        component.quantity ?? '',
        component.unit || '',
        component.unitPrice ?? '',
        component.subtotal ?? '',
        index === 0 ? row.totalCost || '' : '',
        component.note || row.note || '',
      ]);
    }),
  ];
  const sheet3 = XLSX.utils.aoa_to_sheet(recipeSheetRows);
  sheet3['!cols'] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
    { wch: 8 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet3, '레시피 출력');

  XLSX.writeFile(
    wb,
    withDownloadDateSuffix(`${getActiveBrand().name}_${periodPart} 원가계산 보고서.xlsx`)
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
const NOW = new Date();
const PERIOD_LABEL = `${NOW.getFullYear()}년 ${NOW.getMonth() + 1}월`;

export default function Page() {
  const [riskThreshold, setRiskThreshold] = useState(35);
  const [cats, setCats] = useState({
    pizza: true,
    personal: true,
    side: true,
    set: true,
    edge: true,
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
    { summary: true, catTable: true, perCategory: true, riskList: true, includeEdge: false },
    draft => {
      if (draft.riskThreshold) setRiskThreshold(draft.riskThreshold);
      if (draft.cats) setCats(c => ({ ...c, ...draft.cats }));
    }
  );
  const [viewTab, setViewTab] = useState('report');
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recipeRows, setRecipeRows] = useState([]);
  const strictPostingEnabled = useSettingValue('strictPosting') === 'on';

  const [costByCategory, setCostByCategory] = useState(() =>
    Object.fromEntries(
      Object.entries(CAT_META).map(([, m]) => [m.id, { label: m.label, color: m.color, menus: [] }])
    )
  );
  const loadedCtxRef = useRef(null); // { prices, ctx } — loaded once, reused for includeEdge toggle

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const [prices, ingredients, recipeMaps, edges, latestPriceLookup, recipeGroups] =
            await Promise.all([
              getAllMenuPrices(),
              getAllIngredients(),
              loadMenuRecipeMaps(),
              getAllEdges(),
              buildLatestPriceLookup(),
              getAllRecipeGroups(),
            ]);
          if (ignore) return;

          if (prices.length === 0) {
            setDataError('메뉴 가격 데이터가 없어요. 원가계산 → 판매가를 먼저 등록해 주세요.');
            setIsLoading(false);
            return;
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
          const nextRecipeRows = buildRecipePrintRows({
            detailMaps: ctx.detailMaps,
            unitPriceMap: ctx.upm,
            recipeGroups: ctx.recipeGroups,
          });
          loadedCtxRef.current = { prices, ctx };
          setRecipeRows(nextRecipeRows);
          setCostByCategory(
            buildCostReportData(
              prices,
              { ...ctx, includeEdge: opts.includeEdge },
              CAT_KEYS,
              CAT_META
            )
          );
          setDataError(null);
        } catch (err) {
          if (ignore) return;

          console.error('[cost report]', err);
          setDataError('메뉴 가격 데이터를 불러오는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;

        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 데이터를 먼저 업로드해 주세요.');
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 엣지 포함 옵션 변경 시 비용 재계산
  useEffect(() => {
    if (!loadedCtxRef.current) return;
    const { prices, ctx } = loadedCtxRef.current;
    setCostByCategory(
      buildCostReportData(prices, { ...ctx, includeEdge: opts.includeEdge }, CAT_KEYS, CAT_META)
    );
  }, [opts.includeEdge]);

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
  const recipeMenus = useMemo(() => buildRecipePrintMenus(recipeRows), [recipeRows]);
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
    exportCostXlsx(periodLabel, activeCats, recipeRows).catch(err =>
      showToast('엑셀 내보내기 실패: ' + err.message, 'error')
    );

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '원가계산 보고서']}
      title="원가계산 보고서 생성"
      sub="5개 카테고리(피자·1인피자·세트박스·사이드·엣지&도우)의 종합 원가를 한 장에 모아요."
      kind="cost"
      exportNote={
        strictPostingEnabled && strictPostingIssues.length > 0
          ? `단가는 최신 제때 업로드 기준입니다. 미연동 재료 ${strictPostingIssues.length}건이 있어 보고서 생성이 차단됩니다.`
          : '단가는 최신 제때 업로드 기준으로 고정됩니다.'
      }
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      onBeforeGenerate={guardStrictPosting}
      options={
        <CostReportOptions
          cats={cats}
          onCatChange={updCat}
          opts={opts}
          onOptionChange={updOpt}
          riskThreshold={riskThreshold}
          onRiskThreshold={setRiskThreshold}
          docFormat={docFormat}
          onFormatChange={updFmt}
        />
      }
      preview={
        <CostReportPreview
          viewTab={viewTab}
          onViewTab={setViewTab}
          activeCats={activeCats}
          totalCount={totalCount}
          recipeMenus={recipeMenus}
          riskThreshold={riskThreshold}
          opts={opts}
          catStats={catStats}
          allAvg={allAvg}
          allRisk={allRisk}
          allMaxRate={allMaxRate}
          riskMenus={riskMenus}
          diagnostics={diagnostics}
          recipeRows={recipeRows}
          viewLabel={viewLabel}
        />
      }
    />
  );
}
