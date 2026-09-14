'use client';
import {
  BrokenRefsBanner,
  DiscontinuedRefsBanner,
  ProductCodeDupesBanner,
  UnusedCleanupBanner,
  DuplicateGroupsBanner,
} from './diagnostics';

export function IngredientDiagnostics({
  brokenRefs,
  discontinuedRefs = [],
  discontinuedRefsLoading = false,
  onLinkSubstitute,
  productCodeDupes,
  duplicateGroupCount,
  duplicateDiagnostics,
  unusedCategories = [],
  unusedTags = [],
  dedupeConfirm,
  dedupeBusy,
  onDedupeConfirm,
  onDedupeCancel,
  onRepairProductCodeDuplicates,
  onRemoveCategory,
  onRemoveTag,
  onRemoveAllUnusedTags,
  onRenameCategory,
  onRenameTag,
  isAdmin = false,
}) {
  return (
    <>
      <DiscontinuedRefsBanner
        refs={discontinuedRefs}
        loading={discontinuedRefsLoading}
        onLinkSubstitute={onLinkSubstitute}
        isViewer={!isAdmin}
      />
      <BrokenRefsBanner brokenRefs={brokenRefs} />
      <ProductCodeDupesBanner
        productCodeDupes={productCodeDupes}
        dedupeConfirm={dedupeConfirm}
        dedupeBusy={dedupeBusy}
        onDedupeConfirm={onDedupeConfirm}
        onDedupeCancel={onDedupeCancel}
        onRepairProductCodeDuplicates={onRepairProductCodeDuplicates}
      />
      <UnusedCleanupBanner
        unusedCategories={unusedCategories}
        unusedTags={unusedTags}
        isAdmin={isAdmin}
        onRemoveCategory={onRemoveCategory}
        onRemoveTag={onRemoveTag}
        onRemoveAllUnusedTags={onRemoveAllUnusedTags}
        onRenameCategory={onRenameCategory}
        onRenameTag={onRenameTag}
      />
      <DuplicateGroupsBanner
        duplicateGroupCount={duplicateGroupCount}
        duplicateDiagnostics={duplicateDiagnostics}
      />
    </>
  );
}
