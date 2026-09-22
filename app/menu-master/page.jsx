'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePagination } from '@/hooks/usePagination';
import { showToast } from '@/components/Toast';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllMenuMaster } from '@/lib/menu-master';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';
import { MenuMasterDialogs } from '@/components/menu-master/MenuMasterDialogs';
import { MenuMasterEmptyState } from '@/components/menu-master/MenuMasterEmptyState';
import { MenuMasterFilterPanel } from '@/components/menu-master/MenuMasterFilterPanel';
import { MenuMasterHeaderActions } from '@/components/menu-master/MenuMasterHeaderActions';
import { MenuMasterIssuesPanel } from '@/components/menu-master/MenuMasterIssuesPanel';
import { MenuMasterLoadingTable } from '@/components/menu-master/MenuMasterLoadingTable';
import { MenuMasterStatsRow } from '@/components/menu-master/MenuMasterStatsRow';
import { MenuRecipeOrphanBanner } from '@/components/menu-master/MenuRecipeOrphanBanner';
import { MenuMasterTablePanel } from '@/components/menu-master/MenuMasterTablePanel';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import { getActiveBrandId } from '@/lib/active-brand';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { useMenuMasterFilters } from '@/hooks/useMenuMasterFilters';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  loadMenuRecipeSummaryMap,
  MENU_RECIPE_SUMMARY_STATUS,
} from '@/lib/menu-master/recipe-summary';
import { isRecipeSummaryExcludedFromTracking } from '@/lib/menu-master/recipe-issues';
import {
  normalizeMenuCodeCategories,
  normalizePersonalPizzaCodes,
} from '@/lib/menu-master/normalize';
import { splitEdgeMenuSizes } from '@/lib/menu-master/edge-size-split';
import {
  buildMenuReadinessMap,
  buildNutritionLinkedMenuCodeSet,
} from '@/lib/menu-master/readiness';
import { loadMenuAllergenMap } from '@/lib/menu-master/allergen-summary';
import { MenuDataQualityPanel } from '@/components/menu-master/MenuDataQualityPanel';
import { MenuReadinessPanel } from '@/components/menu-master/MenuReadinessPanel';
import { useMenuMasterActions } from './useMenuMasterActions';
import { exportMenuMasterCsv } from './menuMasterExport';

// 7번가(main) 전용 피자 카테고리 프리셋. 다른 브랜드는 빈 프리셋 → 자유 입력,
// 칩·통계는 실제 데이터에 존재하는 카테고리에서 동적으로 도출한다.
const PIZZA_CATEGORIES = [
  MENU_CATEGORY.PIZZA,
  MENU_CATEGORY.PERSONAL,
  MENU_CATEGORY.SIDE,
  MENU_CATEGORY.SET,
  MENU_CATEGORY.SAUCE,
  MENU_CATEGORY.DRINK,
  MENU_CATEGORY.EDGE,
  MENU_CATEGORY.EXTRA_TOPPING,
];

const EMPTY_ROWS = [];
const EMPTY_RECIPE_SUMMARY_MAP = new Map();
const EMPTY_NUTRITION_LINKED_CODES = new Set();
const EMPTY_MENU_ALLERGEN_MAP = new Map();

/* ── 메인 페이지 ── */
export default function Page() {
  const isMain = useIsMainBrand();
  const { isViewer } = useCurrentRole();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'issues' | 'readiness' | 'quality'
  const [readinessMap, setReadinessMap] = useState(new Map());
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importingToppings, setImportingToppings] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editIntent, setEditIntent] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePlan, setDeletePlan] = useState(null);
  const [deletePlanLoading, setDeletePlanLoading] = useState(false);
  // 브랜드 카테고리 프리셋 — SSR/첫 렌더는 서버와 동일하게 기본값(피자)로 두고,
  // 마운트 후 활성 브랜드에 맞춰 교정한다(하이드레이션 불일치 방지).
  const [brandCats, setBrandCats] = useState(PIZZA_CATEGORIES);

  useEffect(() => {
    setBrandCats(getActiveBrandId() === 'main' ? PIZZA_CATEGORIES : []);
  }, []);

  const { data, loading, error, reload } = useDBLoad(
    async () => {
      await normalizePersonalPizzaCodes().catch(e =>
        console.warn('[menu-master] 코드 정규화 실패', e)
      );
      await normalizeMenuCodeCategories().catch(e =>
        console.warn('[menu-master] 코드 분류 정규화 실패', e)
      );
      await splitEdgeMenuSizes().catch(e => console.warn('[menu-master] 엣지 사이즈 분리 실패', e));
      const nextRows = await getAllMenuMaster();
      let nextRecipeSummaryMap = new Map();
      try {
        nextRecipeSummaryMap = await loadMenuRecipeSummaryMap(nextRows);
      } catch (err) {
        console.warn('[menu-master] 레시피 원가 요약 계산 실패', err);
      }
      let nextNutritionLinkedCodes = EMPTY_NUTRITION_LINKED_CODES;
      try {
        nextNutritionLinkedCodes = await buildNutritionLinkedMenuCodeSet();
      } catch (err) {
        console.warn('[menu-master] 영양성분 연동 여부 계산 실패', err);
      }
      let nextMenuAllergenMap = EMPTY_MENU_ALLERGEN_MAP;
      try {
        nextMenuAllergenMap = await loadMenuAllergenMap(nextRows);
      } catch (err) {
        console.warn('[menu-master] 메뉴별 알레르기 집계 실패', err);
      }
      return {
        rows: nextRows,
        recipeSummaryMap: nextRecipeSummaryMap,
        nutritionLinkedCodes: nextNutritionLinkedCodes,
        menuAllergenMap: nextMenuAllergenMap,
      };
    },
    { initialData: null, onError: err => console.error('[MenuMaster] load failed', err) }
  );
  const rows = data?.rows ?? EMPTY_ROWS;
  const recipeSummaryMap = data?.recipeSummaryMap ?? EMPTY_RECIPE_SUMMARY_MAP;
  const nutritionLinkedCodes = data?.nutritionLinkedCodes ?? EMPTY_NUTRITION_LINKED_CODES;
  const menuAllergenMap = data?.menuAllergenMap ?? EMPTY_MENU_ALLERGEN_MAP;
  useVisibilityRefresh(reload);

  const {
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    subFilter,
    setSubFilter,
    search,
    setSearch,
    statusFiltered,
    displayCategories,
    catCounts,
    filtered,
    visibleRows,
    showHidden,
    setShowHidden,
    hiddenCount,
  } = useMenuMasterFilters(rows, brandCats);

  const {
    handleDeleteRow,
    openDeleteDialog,
    handleResetAndSeed,
    handleSeed,
    handleImportToppings,
    handleSaveRow,
  } = useMenuMasterActions({
    reload,
    setDeleteTarget,
    setDeletePlan,
    setDeletePlanLoading,
    setSeeding,
    setResetting,
    setImportingToppings,
    setEditRow,
    setAddOpen,
    canEdit: !isViewer,
  });

  function handleExportCsv() {
    exportMenuMasterCsv(filtered, { menuAllergenMap, recipeSummaryMap });
    showToast(`CSV ${filtered.length}개 내보내기 완료`, 'ok');
  }

  function openEdit(row, intent = null) {
    setEditIntent(intent);
    setEditRow(row);
  }

  // 숨김 처리한 메뉴는 상단 통계/상태 탭 개수에서도 제외한다(완전 숨김 의도).
  const active = visibleRows.filter(r => r.status === 'active');
  const discontinued = visibleRows.filter(r => r.status === 'discontinued');
  const testRows = visibleRows.filter(r => r.status === 'test');
  // buildRecipeIssues와 같은 기준(UNSUPPORTED·EDGE 제외)으로 "레시피 작성" 진행률을 센다 —
  // 따로 구현하면 엣지처럼 상태가 늘어날 때 한쪽만 갱신되는 버그가 생기기 쉽다.
  const recipeSummaries = [...recipeSummaryMap.values()].filter(
    summary => !isRecipeSummaryExcludedFromTracking(summary)
  );
  const recipeWritten = recipeSummaries.filter(summary => summary.hasRecipe).length;
  const recipeNeedsCheck = recipeSummaries.filter(
    summary => summary.hasRecipe && summary.status !== MENU_RECIPE_SUMMARY_STATUS.READY
  ).length;

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 60);

  // '출시 준비'와 '품질 점검' 탭 전환 시 readiness 기반 진단 계산
  useEffect(() => {
    if (viewMode !== 'readiness' && viewMode !== 'quality') return;
    if (rows.length === 0) {
      setReadinessMap(new Map());
      setReadinessLoading(false);
      return;
    }
    let cancelled = false;
    setReadinessLoading(true);
    buildMenuReadinessMap(rows, recipeSummaryMap)
      .then(map => {
        if (!cancelled) setReadinessMap(map);
      })
      .catch(e => {
        if (!cancelled) {
          console.warn('[menu-master] readiness 계산 실패', e);
          setReadinessMap(new Map());
        }
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, rows, recipeSummaryMap]);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴', '메뉴 마스터']}
        title="메뉴 마스터"
        sub={
          loading
            ? '로딩 중…'
            : `총 ${rows.length}개 · 원가·영양·원산지·알레르기 전 모듈의 기준 데이터`
        }
        actions={
          <MenuMasterHeaderActions
            hasRows={rows.length > 0}
            isViewer={isViewer}
            isMain={isMain}
            seeding={seeding}
            resetting={resetting}
            importingToppings={importingToppings}
            onExportCsv={handleExportCsv}
            onSeed={handleSeed}
            onImportToppings={handleImportToppings}
            onReset={() => setConfirmReset(true)}
            onAdd={() => setAddOpen(true)}
          />
        }
      />

      <MenuRecipeOrphanBanner isViewer={isViewer} />

      <MenuMasterStatsRow
        rows={visibleRows}
        activeRows={active}
        discontinuedRows={discontinued}
        testRows={testRows}
        displayCategories={displayCategories}
        recipeSummaries={recipeSummaries}
        recipeWritten={recipeWritten}
        recipeNeedsCheck={recipeNeedsCheck}
      />

      {loading && <MenuMasterLoadingTable />}

      {!loading && error && (
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          <div>데이터를 불러오지 못했습니다: {error.message}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <MenuMasterEmptyState
          isMain={isMain}
          isViewer={isViewer}
          seeding={seeding}
          onSeed={handleSeed}
        />
      )}

      {rows.length > 0 && (
        <div className="content-enter">
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              className={'chip' + (viewMode === 'list' ? ' active' : '')}
              onClick={() => setViewMode('list')}
            >
              목록
            </button>
            <button
              className={'chip' + (viewMode === 'issues' ? ' active' : '')}
              onClick={() => setViewMode('issues')}
            >
              이슈{recipeNeedsCheck > 0 && ` ${recipeNeedsCheck}`}
            </button>
            <button
              className={'chip' + (viewMode === 'readiness' ? ' active' : '')}
              onClick={() => setViewMode('readiness')}
            >
              출시 준비
            </button>
            <button
              className={'chip' + (viewMode === 'quality' ? ' active' : '')}
              onClick={() => setViewMode('quality')}
            >
              품질 점검
            </button>
          </div>

          {viewMode === 'quality' ? (
            <MenuDataQualityPanel
              rows={rows}
              recipeSummaryMap={recipeSummaryMap}
              readinessMap={readinessMap}
              loading={readinessLoading}
              isViewer={isViewer}
              onEdit={openEdit}
            />
          ) : viewMode === 'readiness' ? (
            <MenuReadinessPanel
              readinessMap={readinessMap}
              loading={readinessLoading}
              catFilter={catFilter}
              isViewer={isViewer}
              onEdit={openEdit}
            />
          ) : viewMode === 'issues' ? (
            <MenuMasterIssuesPanel
              rows={rows}
              recipeSummaryMap={recipeSummaryMap}
              isViewer={isViewer}
              onEdit={openEdit}
            />
          ) : (
            <>
              <MenuMasterFilterPanel
                rows={visibleRows}
                activeRows={active}
                discontinuedRows={discontinued}
                testRows={testRows}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                catFilter={catFilter}
                onCatFilter={setCatFilter}
                subFilter={subFilter}
                onSubFilter={setSubFilter}
                search={search}
                onSearch={setSearch}
                displayCategories={displayCategories}
                catCounts={catCounts}
                showHidden={showHidden}
                onToggleShowHidden={() => setShowHidden(v => !v)}
                hiddenCount={hiddenCount}
              />

              <MenuMasterTablePanel
                filteredRows={filtered}
                pagedRows={paged}
                totalRows={rows}
                recipeSummaryMap={recipeSummaryMap}
                nutritionLinkedCodes={nutritionLinkedCodes}
                menuAllergenMap={menuAllergenMap}
                isViewer={isViewer}
                onEdit={openEdit}
                onDelete={openDeleteDialog}
                page={page}
                totalPages={totalPages}
                onPage={goTo}
                total={total}
              />
            </>
          )}
        </div>
      )}

      <MenuPriceUploadCard onReplaced={reload} isViewer={isViewer} />

      <MenuMasterDialogs
        editRow={editRow}
        editIntent={editIntent}
        addOpen={addOpen}
        deleteTarget={deleteTarget}
        deletePlan={deletePlan}
        deletePlanLoading={deletePlanLoading}
        confirmReset={confirmReset}
        isViewer={isViewer}
        brandCats={brandCats}
        onSaveRow={handleSaveRow}
        onRecipeSaved={reload}
        onCloseEdit={() => {
          setEditRow(null);
          setEditIntent(null);
        }}
        onCloseAdd={() => setAddOpen(false)}
        onConfirmDelete={handleDeleteRow}
        onCancelDelete={() => {
          setDeleteTarget(null);
          setDeletePlan(null);
        }}
        onConfirmReset={() => {
          setConfirmReset(false);
          handleResetAndSeed();
        }}
        onCancelReset={() => setConfirmReset(false)}
      />
    </main>
  );
}
