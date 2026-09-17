'use client';
import dynamic from 'next/dynamic';
import { IssuesView } from '@/components/ingredient/IssuesView';
import { IngredientJetteIssuesPanel } from '@/components/ingredient/IngredientJetteIssuesPanel';
import { IngredientManagePanel } from './IngredientManagePanel';
import { IngredientSettingsPanel } from './IngredientSettingsPanel';
import { IngredientReportPanel } from './IngredientReportPanel';

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

/**
 * 탭(관리/단가/이슈/분류·태그/공급업체/보고서)별 본문. page.jsx가 조합한 훅 결과 묶음(`p`)을
 * 그대로 받아 각 탭 컴포넌트에 필요한 props로 풀어 전달한다.
 */
export function IngredientManageViewContent({ p }) {
  const { isViewer, data, pageState, view, batch, actions, jette, onCopy } = p;
  const { rows, latestPriceRows, supplierNames, priceDate } = data;
  const currentView = pageState.view;

  return (
    <>
      {rows.length > 0 && currentView === 'manage' && (
        <IngredientManagePanel
          rows={rows}
          filtered={view.filtered}
          highlightId={pageState.highlightId}
          highlightProductCode={pageState.highlightProductCode}
          activeCount={view.activeCount}
          managedCount={view.managedCount}
          mainCats={view.mainCats}
          categoryCounts={view.categoryCounts}
          hashTags={view.hashTags}
          tagCounts={view.tagCounts}
          uncategorized={view.uncategorized}
          noPriceCount={view.noPriceCount}
          discontinuedCount={view.discontinuedCount}
          excludedCount={view.excludedCount}
          catFilter={pageState.catFilter}
          tagFilter={pageState.tagFilter}
          search={pageState.search}
          onSearch={pageState.setSearch}
          onCatFilter={actions.handleSetCatFilter}
          onTagFilter={actions.handleSetTagFilter}
          batchMode={batch.batchMode}
          selected={batch.selected}
          toggleSelect={batch.toggleSelect}
          deletePending={pageState.deletePending}
          deletePreview={pageState.deletePreview}
          onEdit={pageState.setFormTarget}
          onCopy={onCopy}
          onDeleteStart={pageState.handleDeleteStart}
          onDeleteCancel={actions.handleDeleteCancel}
          onDeleteConfirm={actions.handleExclude}
          onRestore={actions.handleRestore}
          onLinkSubstitute={pageState.setSubstituteSource}
          onHighlightClear={pageState.clearHighlight}
          isViewer={isViewer}
        />
      )}

      {currentView === 'price' && <IngredientPriceView embedded />}

      {currentView === 'issues' && (
        <>
          <IngredientJetteIssuesPanel
            newJetteRows={jette.visibleNewJetteRows}
            jetteRemovedRows={jette.visibleJetteRemovedRows}
            replacementRows={latestPriceRows}
            onAutoRegister={actions.handleAutoRegister}
            onExclude={jette.handleExcludeJetteIssue}
            onReplace={actions.handleReplaceJetteProduct}
            isViewer={isViewer}
          />
          {rows.length > 0 && (
            <IssuesView
              issueRows={view.issueRows}
              onEdit={pageState.setFormTarget}
              onConfirmPriceManual={actions.handleConfirmPriceManual}
              onAckPriceChange={actions.handleAckPriceChange}
              onAckAllPriceChanges={actions.handleAckAllPriceChanges}
              onBulkApplyOriginAllergenNone={actions.handleBulkApplyOriginAllergenNone}
              isViewer={isViewer}
            />
          )}
        </>
      )}

      {rows.length > 0 && currentView === 'settings' && (
        <IngredientSettingsPanel
          mainCats={view.mainCats}
          categoryCounts={view.categoryCounts}
          hashTags={view.hashTags}
          tagCounts={view.tagCounts}
          uncategorized={view.uncategorized}
          discontinuedCount={view.discontinuedCount}
          onRemoveRequest={pageState.setConfirmRemove}
          canEdit={!isViewer}
        />
      )}

      {currentView === 'suppliers' && <SuppliersView ingredientRows={rows} />}

      {currentView === 'report' && (
        <IngredientReportPanel
          filtered={view.filtered}
          rows={rows}
          catFilter={pageState.catFilter}
          tagFilter={pageState.tagFilter}
          search={pageState.debouncedSearch || pageState.search}
          managedCount={view.managedCount}
          priceDate={priceDate}
        />
      )}
    </>
  );
}
