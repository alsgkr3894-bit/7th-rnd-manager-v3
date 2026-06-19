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
import { normalizePersonalPizzaCodes } from '@/lib/menu-master/normalize';
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
];

/* ── 메인 페이지 ── */
export default function Page() {
  const isMain = useIsMainBrand();
  const { isViewer } = useCurrentRole();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'issues'
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
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

  const { data, loading, reload } = useDBLoad(
    async () => {
      await normalizePersonalPizzaCodes().catch(e =>
        console.warn('[menu-master] 코드 정규화 실패', e)
      );
      const nextRows = await getAllMenuMaster();
      let nextRecipeSummaryMap = new Map();
      try {
        nextRecipeSummaryMap = await loadMenuRecipeSummaryMap(nextRows);
      } catch (err) {
        console.warn('[menu-master] 레시피 원가 요약 계산 실패', err);
      }
      return { rows: nextRows, recipeSummaryMap: nextRecipeSummaryMap };
    },
    { initialData: null, onError: err => console.error('[MenuMaster] load failed', err) }
  );
  const rows = data?.rows ?? [];
  const recipeSummaryMap = data?.recipeSummaryMap ?? new Map();
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
  } = useMenuMasterFilters(rows, brandCats);

  const { handleDeleteRow, openDeleteDialog, handleResetAndSeed, handleSeed, handleSaveRow } =
    useMenuMasterActions({
      reload,
      setDeleteTarget,
      setDeletePlan,
      setDeletePlanLoading,
      setSeeding,
      setResetting,
      setEditRow,
      setAddOpen,
    });

  function handleExportCsv() {
    exportMenuMasterCsv(filtered);
    showToast(`CSV ${filtered.length}개 내보내기 완료`, 'ok');
  }

  const active = rows.filter(r => r.status === 'active');
  const discontinued = rows.filter(r => r.status === 'discontinued');
  const testRows = rows.filter(r => r.status === 'test');
  const recipeSummaries = [...recipeSummaryMap.values()].filter(
    summary => summary.status !== MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED
  );
  const recipeWritten = recipeSummaries.filter(summary => summary.hasRecipe).length;
  const recipeNeedsCheck = recipeSummaries.filter(
    summary => summary.hasRecipe && summary.status !== MENU_RECIPE_SUMMARY_STATUS.READY
  ).length;

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 60);

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
            onExportCsv={handleExportCsv}
            onOpenBulkPrice={() => setBulkModal(true)}
            onSeed={handleSeed}
            onReset={() => setConfirmReset(true)}
            onAdd={() => setAddOpen(true)}
          />
        }
      />

      <MenuMasterStatsRow
        rows={rows}
        activeRows={active}
        discontinuedRows={discontinued}
        testRows={testRows}
        displayCategories={displayCategories}
        recipeSummaries={recipeSummaries}
        recipeWritten={recipeWritten}
        recipeNeedsCheck={recipeNeedsCheck}
      />

      {loading && <MenuMasterLoadingTable />}

      {!loading && rows.length === 0 && (
        <MenuMasterEmptyState isMain={isMain} seeding={seeding} onSeed={handleSeed} />
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
          </div>

          {viewMode === 'issues' ? (
            <MenuMasterIssuesPanel
              rows={rows}
              recipeSummaryMap={recipeSummaryMap}
              isViewer={isViewer}
              onEdit={setEditRow}
            />
          ) : (
            <>
              <MenuMasterFilterPanel
                rows={rows}
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
              />

              <MenuMasterTablePanel
                filteredRows={filtered}
                pagedRows={paged}
                totalRows={rows}
                recipeSummaryMap={recipeSummaryMap}
                isViewer={isViewer}
                onEdit={setEditRow}
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

      <MenuPriceUploadCard onReplaced={reload} />

      <MenuMasterDialogs
        editRow={editRow}
        addOpen={addOpen}
        bulkOpen={bulkModal}
        deleteTarget={deleteTarget}
        deletePlan={deletePlan}
        deletePlanLoading={deletePlanLoading}
        confirmReset={confirmReset}
        brandCats={brandCats}
        onSaveRow={handleSaveRow}
        onRecipeSaved={reload}
        onCloseEdit={() => setEditRow(null)}
        onCloseAdd={() => setAddOpen(false)}
        onCloseBulk={() => setBulkModal(false)}
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
