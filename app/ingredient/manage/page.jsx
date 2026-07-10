'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { previewIngredientDelete } from '@/lib/ingredient';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { IngredientForm } from './IngredientForm';
import { IssuesView } from '@/components/ingredient/IssuesView';
import { IngredientJetteIssuesPanel } from '@/components/ingredient/IngredientJetteIssuesPanel';
import { IngredientBatchToolbar } from '@/components/ingredient/BatchToolbar';
import { SubstituteLinkModal } from '@/components/ingredient/SubstituteLinkModal';
import { TabButton } from '@/components/cost/shared/TabButton';
import { IngredientManagePanel } from './IngredientManagePanel';
import { IngredientSettingsPanel } from './IngredientSettingsPanel';
import { IngredientDiagnostics } from './IngredientDiagnostics';
import { useIngredientManageData } from './useIngredientManageData';
import { useIngredientManageView } from './useIngredientManageView';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { IngredientReportPanel } from './IngredientReportPanel';
import { KEYS } from '@/lib/note/keys';
import { useIngredientManageActions } from './useIngredientManageActions';
import { normalizeManageView, readInitialManageView } from './ingredientManageUtils';
import dynamic from 'next/dynamic';

const SuppliersView = dynamic(
  () => import('@/components/cost/ingredient-price/SuppliersView').then(m => m.SuppliersView),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 200 }} /> }
);
const IngredientPriceView = dynamic(
  () =>
    import('@/components/cost/ingredient-price/IngredientPriceView').then(
      m => m.IngredientPriceView
    ),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 320 }} /> }
);

function productCodeKey(rowOrCode) {
  const value = rowOrCode && typeof rowOrCode === 'object' ? rowOrCode.productCode : rowOrCode;
  return String(value || '')
    .trim()
    .toUpperCase();
}

export default function Page() {
  const { isViewer } = useCurrentRole();
  const {
    rows,
    setRows,
    prevPriceMap,
    priceDate,
    loading,
    load,
    brokenRefs,
    productCodeDupes,
    newJetteRows,
    jetteRemovedRows,
    latestPriceRows,
  } = useIngredientManageData();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.INGREDIENT_CAT_FILTER, 'all', value =>
    typeof value === 'string' && value ? value : 'all'
  );
  const [tagFilter, setTagFilter] = useState('all');
  const [view, setViewState] = useState('manage');
  const setView = useCallback(nextView => {
    const normalized = normalizeManageView(nextView);
    setViewState(normalized);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (normalized === 'manage') url.searchParams.delete('view');
    else url.searchParams.set('view', normalized);
    window.history.replaceState(null, '', url);
  }, []);
  const [highlightId, setHighlightId] = useState(null);
  const [highlightProductCode, setHighlightProductCode] = useState(null);
  const [hiddenJetteIssueCodes, setHiddenJetteIssueCodes] = useState(() => new Set());

  useEffect(() => {
    setView(readInitialManageView());
    // URL 파라미터 일괄 처리(한 번만): catFilter, query(검색어), highlight/productCode(행 강조)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('catFilter');
      const queryParam = params.get('query');
      const highlightParam = params.get('highlight');
      const productCodeParam = params.get('productCode');
      if (catParam) setCatFilter(catParam);
      if (queryParam) setSearch(queryParam);
      if (highlightParam) setHighlightId(highlightParam);
      if (productCodeParam) setHighlightProductCode(productCodeParam);
      if (catParam || queryParam || highlightParam || productCodeParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete('catFilter');
        url.searchParams.delete('query');
        url.searchParams.delete('highlight');
        url.searchParams.delete('productCode');
        window.history.replaceState(null, '', url);
      }
    }
    // setView(useCallback)·setCatFilter(useState setter) 모두 안정적 참조 → 사실상 mount 1회 실행.
  }, [setView, setCatFilter]);

  // highlightId 자동 해제는 IngredientManagePanel에서 rows 로드 후 처리 (onHighlightClear)

  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const deletePreviewRequestRef = useRef(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [substituteSource, setSubstituteSource] = useState(null);
  const [dedupeConfirm, setDedupeConfirm] = useState(false);
  const [dedupeBusy, setDedupeBusy] = useState(false);
  const { batchMode, selected, clearSelection, startBatch, exitBatch, toggleSelect } =
    useBatchSelection();
  const {
    activeCount,
    managedCount,
    discontinuedCount,
    excludedCount,
    categoryCounts,
    mainCats,
    tagCounts,
    hashTags,
    originSuggestions,
    uncategorized,
    noPriceCount,
    issueRows,
    duplicateDiagnostics,
    duplicateGroupCount,
    unusedCategories,
    unusedTags,
    filtered,
    sub,
  } = useIngredientManageView({
    rows,
    prevPriceMap,
    catFilter,
    tagFilter,
    debouncedSearch,
    loading,
    priceDate,
  });

  useEffect(() => {
    clearSelection();
  }, [debouncedSearch, clearSelection]);

  useEffect(() => {
    if (!deletePending) {
      deletePreviewRequestRef.current += 1;
      setDeletePreview(null);
    }
  }, [deletePending]);

  const handleDeleteStart = useCallback(async row => {
    const requestId = deletePreviewRequestRef.current + 1;
    deletePreviewRequestRef.current = requestId;
    setDeletePending(row);
    setDeletePreview(null);
    if (row?.id && row?.isManual && !row?.productCode) {
      try {
        const preview = await previewIngredientDelete(row.id);
        if (deletePreviewRequestRef.current === requestId) {
          setDeletePreview(preview?.ingredient?.id === row.id ? preview : null);
        }
      } catch {
        // preview 실패는 삭제 흐름에 영향 없음
      }
    }
  }, []);

  const {
    handleReset,
    handleRemoveCategory,
    handleRemoveTag,
    handleRemoveAllUnusedTags,
    handleRenameCategory,
    handleRenameTag,
    handleRepairProductCodeDuplicates,
    handleSave,
    handleExclude,
    handleRestore,
    handleConfirmPriceManual,
    handleAutoRegister,
    handleBatchDelete,
    handleBulkDiscontinue,
    handleBulkSetCategory,
    handleBulkApplyOriginAllergenNone,
    handleSetCatFilter,
    handleSetTagFilter,
    handleDeleteCancel,
    handleReplaceJetteProduct,
  } = useIngredientManageActions({
    load,
    setRows,
    formTarget,
    setFormTarget,
    resetting,
    setResetting,
    setResetConfirm,
    setDeletePending,
    dedupeBusy,
    setDedupeBusy,
    setDedupeConfirm,
    selected,
    exitBatch,
    clearSelection,
    setCatFilter,
    setTagFilter,
    canEdit: !isViewer,
  });

  const visibleNewJetteRows = useMemo(
    () => newJetteRows.filter(row => !hiddenJetteIssueCodes.has(productCodeKey(row))),
    [newJetteRows, hiddenJetteIssueCodes]
  );
  const visibleJetteRemovedRows = useMemo(
    () => jetteRemovedRows.filter(row => !hiddenJetteIssueCodes.has(productCodeKey(row))),
    [jetteRemovedRows, hiddenJetteIssueCodes]
  );
  const handleExcludeJetteIssue = useCallback(
    async row => {
      const code = productCodeKey(row);
      if (code) {
        setHiddenJetteIssueCodes(prev => {
          const next = new Set(prev);
          next.add(code);
          return next;
        });
      }
      const ok = await handleExclude(row);
      if (!ok && code) {
        setHiddenJetteIssueCodes(prev => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      }
    },
    [handleExclude]
  );

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={sub}
        actions={
          <>
            {batchMode ? (
              <IngredientBatchToolbar
                selected={selected}
                mainCats={mainCats}
                onDelete={handleBatchDelete}
                onBulkDiscontinue={handleBulkDiscontinue}
                onBulkSetCategory={handleBulkSetCategory}
                onExit={exitBatch}
              />
            ) : (
              <>
                {resetConfirm ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
                      모든 식자재 데이터({rows.length}개)를 삭제할까요?
                    </span>
                    <button
                      className="btn"
                      style={{
                        background: 'var(--negative)',
                        color: 'var(--surface)',
                        border: 'none',
                      }}
                      onClick={handleReset}
                      disabled={resetting || isViewer}
                    >
                      {resetting ? '삭제 중…' : '삭제'}
                    </button>
                    <button className="btn" onClick={() => setResetConfirm(false)}>
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn"
                    onClick={() => setResetConfirm(true)}
                    style={{ color: 'var(--text-3)' }}
                    disabled={rows.length === 0 || isViewer}
                  >
                    <Icon.trash style={{ width: 14, height: 14 }} /> 데이터 초기화
                  </button>
                )}
                <button
                  className="btn"
                  onClick={startBatch}
                  disabled={rows.length === 0 || isViewer}
                >
                  선택
                </button>
                <button
                  className="btn primary"
                  onClick={() => setFormTarget('new')}
                  disabled={isViewer}
                >
                  <Icon.plus style={{ width: 14, height: 14 }} /> 식자재 추가
                </button>
              </>
            )}
          </>
        }
      />

      {!loading && (
        <div
          style={{
            display: 'flex',
            gap: 2,
            borderBottom: '1px solid var(--divider)',
            marginBottom: -12,
            overflowX: 'auto',
          }}
        >
          <TabButton active={view === 'manage'} onClick={() => setView('manage')}>
            관리 {activeCount}
          </TabButton>
          <TabButton active={view === 'price'} onClick={() => setView('price')}>
            단가
          </TabButton>
          <TabButton
            active={view === 'issues'}
            onClick={() => setView('issues')}
            badge={issueRows.length > 0 ? issueRows.length : null}
          >
            이슈
          </TabButton>
          <TabButton active={view === 'settings'} onClick={() => setView('settings')}>
            분류·태그
          </TabButton>
          <TabButton active={view === 'suppliers'} onClick={() => setView('suppliers')}>
            공급업체
          </TabButton>
          <TabButton active={view === 'report'} onClick={() => setView('report')}>
            보고서
          </TabButton>
        </div>
      )}

      {!loading &&
        rows.length === 0 &&
        view !== 'price' &&
        view !== 'suppliers' &&
        view !== 'report' && (
          <div className="card" style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>아직 데이터가 없습니다</div>
              <div style={{ fontSize: 13 }}>
                <b>식자재 추가</b> 버튼으로 직접 등록하거나, 제때 가격 파일을 업로드해주세요.
              </div>
            </div>
          </div>
        )}

      <IngredientDiagnostics
        brokenRefs={brokenRefs}
        productCodeDupes={productCodeDupes}
        duplicateGroupCount={duplicateGroupCount}
        duplicateDiagnostics={duplicateDiagnostics}
        unusedCategories={unusedCategories}
        unusedTags={unusedTags}
        dedupeConfirm={dedupeConfirm}
        dedupeBusy={dedupeBusy}
        onDedupeConfirm={() => setDedupeConfirm(true)}
        onDedupeCancel={() => setDedupeConfirm(false)}
        onRepairProductCodeDuplicates={handleRepairProductCodeDuplicates}
        onRemoveCategory={handleRemoveCategory}
        onRemoveTag={handleRemoveTag}
        onRemoveAllUnusedTags={handleRemoveAllUnusedTags}
        onRenameCategory={handleRenameCategory}
        onRenameTag={handleRenameTag}
        isAdmin={!isViewer}
      />

      {rows.length > 0 && view === 'manage' && (
        <IngredientManagePanel
          rows={rows}
          filtered={filtered}
          highlightId={highlightId}
          highlightProductCode={highlightProductCode}
          activeCount={activeCount}
          managedCount={managedCount}
          mainCats={mainCats}
          categoryCounts={categoryCounts}
          hashTags={hashTags}
          tagCounts={tagCounts}
          uncategorized={uncategorized}
          noPriceCount={noPriceCount}
          discontinuedCount={discontinuedCount}
          excludedCount={excludedCount}
          catFilter={catFilter}
          tagFilter={tagFilter}
          search={search}
          onSearch={setSearch}
          onCatFilter={handleSetCatFilter}
          onTagFilter={handleSetTagFilter}
          batchMode={batchMode}
          selected={selected}
          toggleSelect={toggleSelect}
          deletePending={deletePending}
          deletePreview={deletePreview}
          onEdit={setFormTarget}
          onCopy={row => setFormTarget({ __copyFrom: row })}
          onDeleteStart={handleDeleteStart}
          onDeleteCancel={handleDeleteCancel}
          onDeleteConfirm={handleExclude}
          onRestore={handleRestore}
          onLinkSubstitute={setSubstituteSource}
          onHighlightClear={() => {
            setHighlightId(null);
            setHighlightProductCode(null);
          }}
          isViewer={isViewer}
        />
      )}

      {view === 'price' && <IngredientPriceView embedded />}

      {view === 'issues' && (
        <>
          <IngredientJetteIssuesPanel
            newJetteRows={visibleNewJetteRows}
            jetteRemovedRows={visibleJetteRemovedRows}
            replacementRows={latestPriceRows}
            onAutoRegister={handleAutoRegister}
            onExclude={handleExcludeJetteIssue}
            onReplace={handleReplaceJetteProduct}
            isViewer={isViewer}
          />
          {rows.length > 0 && (
            <IssuesView
              issueRows={issueRows}
              onEdit={setFormTarget}
              onConfirmPriceManual={handleConfirmPriceManual}
              onBulkApplyOriginAllergenNone={handleBulkApplyOriginAllergenNone}
              isViewer={isViewer}
            />
          )}
        </>
      )}

      {rows.length > 0 && view === 'settings' && (
        <IngredientSettingsPanel
          mainCats={mainCats}
          categoryCounts={categoryCounts}
          hashTags={hashTags}
          tagCounts={tagCounts}
          uncategorized={uncategorized}
          discontinuedCount={discontinuedCount}
          onRemoveRequest={setConfirmRemove}
          canEdit={!isViewer}
        />
      )}

      {view === 'suppliers' && <SuppliersView />}

      {view === 'report' && (
        <IngredientReportPanel
          filtered={filtered}
          rows={rows}
          catFilter={catFilter}
          tagFilter={tagFilter}
          search={debouncedSearch || search}
          managedCount={managedCount}
          priceDate={priceDate}
        />
      )}

      {!isViewer && confirmRemove && (
        <ConfirmDialog
          open
          danger
          message={
            confirmRemove.type === 'cat'
              ? `'${confirmRemove.value}' 분류를 모든 식자재에서 제거할까요?`
              : `'#${confirmRemove.value}' 태그를 모든 식자재에서 제거할까요?`
          }
          confirmLabel="삭제"
          onConfirm={() => {
            const { type, value } = confirmRemove;
            setConfirmRemove(null);
            if (isViewer) return;
            if (type === 'cat') handleRemoveCategory(value);
            else handleRemoveTag(value);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {!isViewer && (
        <SubstituteLinkModal
          open={!!substituteSource}
          sourceRow={substituteSource}
          candidates={rows}
          onConfirm={target => handleReplaceJetteProduct(substituteSource, target)}
          onClose={() => setSubstituteSource(null)}
        />
      )}

      {!isViewer && formTarget !== null && (
        <IngredientForm
          initial={formTarget === 'new' || formTarget?.__copyFrom ? null : formTarget}
          copyFrom={formTarget?.__copyFrom || null}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
          extraCategories={mainCats}
          originSuggestions={originSuggestions}
          existingProductCodes={rows.filter(r => r.productCode).map(r => r.productCode)}
          jettePriceRows={latestPriceRows}
        />
      )}
    </main>
  );
}
