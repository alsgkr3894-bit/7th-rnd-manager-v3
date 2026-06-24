'use client';
import { TempCostRowsTable } from './temp-cost/TempCostRowsTable';
import { TempCostSummary } from './temp-cost/TempCostSummary';
import { TempIngredientSearch } from './temp-cost/TempIngredientSearch';
import { useTempCostCalculator } from './temp-cost/useTempCostCalculator';
import { CollapsibleCard } from '@/app/note/_CollapsibleCard';

export function TempCostCalculator({ value, onChange }) {
  const {
    parsedCostCalc,
    searchRef,
    ingredientSearch,
    showDropdown,
    filteredIngredients,
    hasLinkedCostRows,
    summary,
    setIngredientSearch,
    setShowDropdown,
    closeDropdownSoon,
    addIngredientRow,
    refreshLinkedCostRows,
    removeIngredientRow,
    updateIngredientRow,
    updateSellingPrice,
  } = useTempCostCalculator({ value, onChange });

  return (
    <CollapsibleCard
      title="임시 원가 계산"
      subtitle="식자재를 검색해 대략적인 원가율을 계산합니다 · 기본 접힘"
      defaultOpen={false}
    >
      <TempIngredientSearch
        search={ingredientSearch}
        searchRef={searchRef}
        showDropdown={showDropdown}
        filteredIngredients={filteredIngredients}
        hasLinkedCostRows={hasLinkedCostRows}
        onSearch={setIngredientSearch}
        onShowDropdown={setShowDropdown}
        onCloseDropdownSoon={closeDropdownSoon}
        onAddIngredient={addIngredientRow}
        onRefreshLinkedCostRows={refreshLinkedCostRows}
      />
      <TempCostRowsTable
        rows={parsedCostCalc.rows}
        onUpdateRow={updateIngredientRow}
        onRemoveRow={removeIngredientRow}
      />
      <TempCostSummary
        totalCost={summary.totalCost}
        costRate={summary.costRate}
        sellingPrice={parsedCostCalc.sellingPrice}
        onSellingPriceChange={updateSellingPrice}
      />
    </CollapsibleCard>
  );
}
