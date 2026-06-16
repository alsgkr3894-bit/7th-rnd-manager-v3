'use client';
import { IngredientPriceEmptyState } from './list-panel/IngredientPriceEmptyState';
import { IngredientPriceFileInfo } from './list-panel/IngredientPriceFileInfo';
import { IngredientPriceFilters } from './list-panel/IngredientPriceFilters';
import { IngredientPriceStats } from './list-panel/IngredientPriceStats';
import { IngredientPriceTable } from './list-panel/IngredientPriceTable';

export function IngredientPriceListPanel({
  fileInfo,
  stats,
  rows,
  filtered,
  taxFilter,
  search,
  priceTable,
  readOnly,
  onTaxFilter,
  onSearch,
  onDeltaFilter,
  onSelectedDelete,
  onRegClick,
  onInlineSave,
}) {
  return (
    <>
      <IngredientPriceFileInfo fileInfo={fileInfo} />
      <IngredientPriceStats stats={stats} onDeltaFilter={onDeltaFilter} />
      {rows.length === 0 && <IngredientPriceEmptyState />}
      {rows.length > 0 && (
        <>
          <IngredientPriceFilters
            taxFilter={taxFilter}
            search={search}
            priceTable={priceTable}
            onTaxFilter={onTaxFilter}
            onSearch={onSearch}
            onSelectedDelete={onSelectedDelete}
          />
          <IngredientPriceTable
            filtered={filtered}
            rows={rows}
            priceTable={priceTable}
            readOnly={readOnly}
            onRegClick={onRegClick}
            onInlineSave={onInlineSave}
          />
        </>
      )}
    </>
  );
}
