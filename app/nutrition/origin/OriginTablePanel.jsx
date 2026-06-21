'use client';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { OriginIngredientTable } from './OriginIngredientTable';
import { OriginMenuTable } from './OriginMenuTable';

const PAGE_SIZE = 80;

export function OriginTablePanel({
  loading,
  viewMode,
  ingredientRows,
  menuRows,
  mapData,
  isExcludedMenu,
}) {
  const activeRows = viewMode === 'ingredient' ? ingredientRows : menuRows;
  const { page, goTo, totalPages, paged, total } = usePagination(activeRows, PAGE_SIZE);
  return (
    <>
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          <OriginIngredientTable
            ingredientRows={paged}
            mapData={mapData}
            isExcludedMenu={isExcludedMenu}
          />
        ) : (
          <OriginMenuTable menuRows={paged} />
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
          : `${menuRows.length}개 메뉴`}{' '}
        표시
      </div>
    </>
  );
}
