'use client';

import {
  IngredientUsageControls,
  IngredientUsageExcludedMenus,
} from '@/components/ingredient/usage/IngredientUsageControls';
import { IngredientUsageStats } from '@/components/ingredient/usage/IngredientUsageStats';
import { IngredientUsageTable } from '@/components/ingredient/usage/IngredientUsageTable';

export function IngredientUsageDashboard({
  allMetaCount,
  displayRows,
  nonHidden,
  hidden,
  hiddenCount,
  oneCount,
  menuCounts,
  totalUsedCount,
  usageCat,
  onUsageCat,
  menuSearch,
  onMenuSearch,
  sortKey,
  sortDir,
  onSort,
  expanded,
  onExpandAll,
  onCollapseAll,
  onToggleRow,
  onToggleHidden,
  showHidden,
  onShowHidden,
  onlyOne,
  onOnlyOne,
  showUnused,
  onShowUnused,
  excludedMenus,
  onExcludeMenu,
  onRestoreMenu,
  onRestoreAllMenus,
  onExportCsv,
}) {
  const byCount = sortKey === 'count' && !showUnused;

  return (
    <>
      <IngredientUsageStats
        allMetaCount={allMetaCount}
        nonHiddenCount={nonHidden.length}
        hiddenCount={hiddenCount}
        oneCount={oneCount}
        totalUsedCount={totalUsedCount}
        onlyOne={onlyOne}
        showUnused={showUnused}
        showHidden={showHidden}
        onOnlyOne={onOnlyOne}
        onShowUnused={onShowUnused}
        onShowHidden={onShowHidden}
      />
      <IngredientUsageControls
        displayRows={displayRows}
        usageCat={usageCat}
        onUsageCat={onUsageCat}
        menuSearch={menuSearch}
        onMenuSearch={onMenuSearch}
        menuCounts={menuCounts}
        showHidden={showHidden}
        showUnused={showUnused}
        onlyOne={onlyOne}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onExportCsv={onExportCsv}
      />
      <IngredientUsageExcludedMenus
        showUnused={showUnused}
        excludedMenus={excludedMenus}
        onRestoreMenu={onRestoreMenu}
        onRestoreAllMenus={onRestoreAllMenus}
      />
      <IngredientUsageTable
        displayRows={displayRows}
        hidden={hidden}
        hiddenCount={hiddenCount}
        showHidden={showHidden}
        showUnused={showUnused}
        usageCat={usageCat}
        byCount={byCount}
        sortKey={sortKey}
        sortDir={sortDir}
        expanded={expanded}
        onSort={onSort}
        onToggleRow={onToggleRow}
        onToggleHidden={onToggleHidden}
        onExcludeMenu={onExcludeMenu}
      />
    </>
  );
}
