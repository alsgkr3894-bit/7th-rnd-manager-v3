import { OriginIngredientTable } from './OriginIngredientTable';
import { OriginMenuTable } from './OriginMenuTable';

export function OriginTablePanel({
  loading,
  viewMode,
  ingredientRows,
  menuRows,
  mapData,
  isExcludedMenu,
}) {
  return (
    <>
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          <OriginIngredientTable
            ingredientRows={ingredientRows}
            mapData={mapData}
            isExcludedMenu={isExcludedMenu}
          />
        ) : (
          <OriginMenuTable menuRows={menuRows} />
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient'
          ? `${ingredientRows.length}개 식자재`
          : `${menuRows.length}개 메뉴`}{' '}
        표시
      </div>
    </>
  );
}
