'use client';
import { AllergenIngredientTable } from './AllergenIngredientTable';
import { AllergenMenuMatrixTable } from './AllergenMenuMatrixTable';

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
  return (
    <>
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          <AllergenIngredientTable
            ingredientRows={ingredientRows}
            mapData={mapData}
            isExcludedMenu={isExcludedMenu}
          />
        ) : (
          <AllergenMenuMatrixTable
            menuMatrix={menuMatrix}
            orderedAllergens={orderedAllergens}
            onDetailRow={onDetailRow}
          />
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
