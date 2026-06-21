'use client';
import {
  BrokenRefsBanner,
  ProductCodeDupesBanner,
  UnusedCleanupBanner,
  DuplicateGroupsBanner,
} from './diagnostics';

export function IngredientDiagnostics({
  brokenRefs,
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
