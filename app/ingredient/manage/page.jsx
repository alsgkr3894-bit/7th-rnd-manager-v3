'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientDiagnostics } from './IngredientDiagnostics';
import { useIngredientManagePage } from './useIngredientManagePage';
import { IngredientManagePageHeaderActions } from './IngredientManagePageHeaderActions';
import { IngredientManageTabs } from './IngredientManageTabs';
import { IngredientManageEmptyState } from './IngredientManageEmptyState';
import { IngredientManageViewContent } from './IngredientManageViewContent';
import { IngredientManagePageDialogs } from './IngredientManagePageDialogs';

export default function Page() {
  const p = useIngredientManagePage();
  const {
    isViewer,
    data,
    discontinuedRefs,
    discontinuedRefsLoading,
    pageState,
    view,
    batch,
    actions,
  } = p;
  const { rows, brokenRefs, productCodeDupes, loading } = data;
  const currentView = pageState.view;

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={view.sub}
        actions={
          <IngredientManagePageHeaderActions
            batchMode={batch.batchMode}
            selected={batch.selected}
            deletableSelectedCount={batch.deletableSelectedCount}
            mainCats={view.mainCats}
            selectableCount={batch.selectableIds.length}
            allSelected={batch.allFilteredSelected}
            onToggleSelectAll={batch.toggleSelectAll}
            onBatchDelete={actions.handleBatchDelete}
            onBulkDiscontinue={actions.handleBulkDiscontinue}
            onBulkSetCategory={actions.handleBulkSetCategory}
            onExitBatch={batch.exitBatch}
            resetConfirm={pageState.resetConfirm}
            onResetConfirmChange={pageState.setResetConfirm}
            rowsCount={rows.length}
            resetting={pageState.resetting}
            onReset={actions.handleReset}
            isViewer={isViewer}
            onStartBatch={batch.startBatch}
            onAddNew={() => pageState.setFormTarget('new')}
          />
        }
      />

      {!loading && (
        <IngredientManageTabs
          view={currentView}
          onView={pageState.setView}
          activeCount={view.activeCount}
          issueCount={view.issueRows.length}
        />
      )}

      {!loading &&
        rows.length === 0 &&
        currentView !== 'price' &&
        currentView !== 'suppliers' &&
        currentView !== 'report' && <IngredientManageEmptyState />}

      <IngredientDiagnostics
        brokenRefs={brokenRefs}
        discontinuedRefs={discontinuedRefs}
        discontinuedRefsLoading={discontinuedRefsLoading}
        onLinkSubstitute={p.onLinkSubstitute}
        productCodeDupes={productCodeDupes}
        duplicateGroupCount={view.duplicateGroupCount}
        duplicateDiagnostics={view.duplicateDiagnostics}
        unusedCategories={view.unusedCategories}
        unusedTags={view.unusedTags}
        dedupeConfirm={pageState.dedupeConfirm}
        dedupeBusy={pageState.dedupeBusy}
        onDedupeConfirm={() => pageState.setDedupeConfirm(true)}
        onDedupeCancel={() => pageState.setDedupeConfirm(false)}
        onRepairProductCodeDuplicates={actions.handleRepairProductCodeDuplicates}
        onRemoveCategory={actions.handleRemoveCategory}
        onRemoveTag={actions.handleRemoveTag}
        onRemoveAllUnusedTags={actions.handleRemoveAllUnusedTags}
        onRenameCategory={actions.handleRenameCategory}
        onRenameTag={actions.handleRenameTag}
        isAdmin={!isViewer}
      />

      <IngredientManageViewContent p={p} />

      <IngredientManagePageDialogs
        isViewer={isViewer}
        confirmRemove={pageState.confirmRemove}
        onConfirmRemoveClose={() => pageState.setConfirmRemove(null)}
        onRemoveCategory={actions.handleRemoveCategory}
        onRemoveTag={actions.handleRemoveTag}
        substituteSource={pageState.substituteSource}
        onSubstituteClose={() => pageState.setSubstituteSource(null)}
        rows={rows}
        onReplaceJetteProduct={actions.handleReplaceJetteProduct}
        formTarget={pageState.formTarget}
        onFormClose={() => pageState.setFormTarget(null)}
        onSave={actions.handleSave}
        mainCats={view.mainCats}
        originSuggestions={view.originSuggestions}
        latestPriceRows={data.latestPriceRows}
        supplierNames={data.supplierNames}
      />
    </main>
  );
}
