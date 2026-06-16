'use client';
import { TempCostRowsTable } from './temp-cost/TempCostRowsTable';
import { TempCostSummary } from './temp-cost/TempCostSummary';
import { TempIngredientSearch } from './temp-cost/TempIngredientSearch';
import { useTempCostCalculator } from './temp-cost/useTempCostCalculator';

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
    <div className="card">
      <div className="card-title" style={{ marginBottom: 4 }}>
        임시 원가 계산
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
        식자재를 검색해 대략적인 원가율을 계산합니다. 저장 시 함께 보관됩니다.
      </div>

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
    </div>
  );
}
