'use client';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { AllergenIngredientTable } from './AllergenIngredientTable';
import { AllergenMenuMatrixTable } from './AllergenMenuMatrixTable';

const PAGE_SIZE = 80;

export function AllergenTablePanel({
  loading,
  viewMode,
  ingredientRows,
  mapData,
  isExcludedMenu,
  menuMatrix,
  orderedAllergens,
  onDetailRow,
}) {
  const activeRows = viewMode === 'ingredient' ? ingredientRows : menuMatrix;
  const { page, goTo, totalPages, paged, total } = usePagination(activeRows, PAGE_SIZE);
  return (
    <>
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          <AllergenIngredientTable
            ingredientRows={paged}
            mapData={mapData}
            isExcludedMenu={isExcludedMenu}
          />
        ) : (
          <AllergenMenuMatrixTable
            menuMatrix={paged}
            orderedAllergens={orderedAllergens}
            onDetailRow={onDetailRow}
          />
        )}
        {!loading && (
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient'
          ? `${ingredientRows.length}개 식자재`
          : `${menuMatrix.length}개 메뉴`}{' '}
        표시
      </div>
    </>
  );
}
