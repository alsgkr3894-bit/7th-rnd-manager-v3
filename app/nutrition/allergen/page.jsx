'use client';
import { useState } from 'react';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { AllergenDetailModal } from './AllergenDetailModal';
import { AllergenPageHeader } from './AllergenPageHeader';
import { AllergenSummaryPanel } from './AllergenSummaryPanel';
import { AllergenTablePanel } from './AllergenTablePanel';
import { AllergenToolbar } from './AllergenToolbar';
import { useAllergenPageData } from './useAllergenPageData';

/**
 * 알레르기 정보 페이지 — 자동 집계 뷰
 *
 * 식자재 관리(cost_ingredients)의 allergens 필드 + 레시피 매핑으로
 * 메뉴별 알레르기를 자동 집계. 수동 메뉴 연결 불필요.
 *
 * 두 가지 뷰:
 *   - 식자재별: 각 식자재의 알레르기 항목 + 매칭된 메뉴 수
 *   - 메뉴별 매트릭스: 메뉴 × 22종 알레르기 체크 (출력용)
 */
export default function Page() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('ingredient'); // 'ingredient' | 'menu'
  const [reorderTarget, setReorderTarget] = useState(null); // 'menu' | 'allergen' | null
  const [menuNameEditOpen, setMenuNameEditOpen] = useState(false);
  const {
    loading,
    mapData,
    ingredientRows,
    isExcludedMenu,
    menuMatrix,
    orderedAllergens,
    detailRow,
    setDetailRow,
    detailRows,
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    menuListForOrder,
    allergenListForOrder,
    menuNameEditMenus,
    totalWithAllergen,
    totalIngredients,
    exportCsv,
    applyMenuOrder,
    applyAllergenOrder,
    resetOrder,
    applyMenuNameOverrides,
  } = useAllergenPageData(search);

  return (
    <main className="main">
      <AllergenPageHeader exportDisabled={menuMatrix.length === 0} onExport={exportCsv} />
      <AllergenSummaryPanel
        totalWithAllergen={totalWithAllergen}
        totalIngredients={totalIngredients}
        matchedMenuCount={menuMatrix.length}
      />
      <AllergenToolbar
        search={search}
        viewMode={viewMode}
        hasCustomOrder={menuOrder.length > 0 || allergenOrder.length > 0}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        onEditMenuNames={() => setMenuNameEditOpen(true)}
        onReorderMenu={() => setReorderTarget('menu')}
        onReorderAllergen={() => setReorderTarget('allergen')}
        onResetOrder={resetOrder}
      />
      <AllergenTablePanel
        loading={loading}
        viewMode={viewMode}
        ingredientRows={ingredientRows}
        mapData={mapData}
        isExcludedMenu={isExcludedMenu}
        menuMatrix={menuMatrix}
        orderedAllergens={orderedAllergens}
        onDetailRow={setDetailRow}
      />

      {reorderTarget === 'menu' && (
        <ReorderModal
          title="메뉴 순서 (석쇠·엣지 변형 함께 이동)"
          items={menuListForOrder}
          onApply={applyMenuOrder}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {reorderTarget === 'allergen' && (
        <ReorderModal
          title="알레르기 22종 순서"
          items={allergenListForOrder}
          onApply={applyAllergenOrder}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {menuNameEditOpen && (
        <MenuNameEditModal
          menus={menuNameEditMenus}
          overrides={menuNameOverrides}
          onApply={applyMenuNameOverrides}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
      <AllergenDetailModal
        detailRow={detailRow}
        detailRows={detailRows}
        onClose={() => setDetailRow(null)}
      />
    </main>
  );
}
