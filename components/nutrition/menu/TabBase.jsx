'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ImportBaseModal } from '@/components/nutrition/menu/ImportBaseModal';
import { MenuGroupList } from '@/components/nutrition/menu/base/MenuGroupList';
import { NutritionInputPanel } from '@/components/nutrition/menu/base/NutritionInputPanel';
import { IngredientCalcModal } from '@/components/nutrition/menu/base/IngredientCalcModal';
import { AutoCalcPreviewModal } from '@/components/nutrition/menu/base/AutoCalcPreviewModal';
import { AddMenuModal } from '@/components/nutrition/menu/base/AddMenuModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { asRecord, noop } from '@/lib/nutrition/values/base-helpers';
import { clearAllBaseData } from '@/lib/nutrition/values/store';
import { useNutritionBaseEditor } from '@/hooks/useNutritionBaseEditor';
import { useRecipeNutritionCalc } from '@/hooks/useRecipeNutritionCalc';
import { useIngredientNutritionCalc } from '@/hooks/useIngredientNutritionCalc';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export function TabBase({ menus, rawMap, onRefresh, menuMasters }) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );

  const editor = useNutritionBaseEditor({ safeRawMap, refresh });
  const {
    selMenu,
    setSelMenu,
    selCrust,
    setSelCrust,
    form,
    setForm,
    setField,
    saving,
    setSaving,
    addMenu,
    setAddMenu,
    newMenuForm,
    setNewMenuForm,
    handleSave,
    handleAddMenu,
    handleDeleteMenu,
    confirmElement: editorConfirmElement,
  } = editor;
  const { showConfirm, confirmElement } = useConfirmDialog();

  const recipeCalc = useRecipeNutritionCalc({
    selMenu,
    selCrust,
    form,
    safeRawMap,
    setForm,
    setSaving,
    refresh,
  });
  const ingredientCalc = useIngredientNutritionCalc({
    selMenu,
    selCrust,
    form,
    safeRawMap,
    setForm,
    setSaving,
    refresh,
  });

  const [importOpen, setImportOpen] = useState(false);
  const selectedMenuName = asDisplayText(selMenu?.menuName, '선택한 메뉴');

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'flex-start' }}>
      {/* 메뉴 목록 */}
      <div
        className="card"
        style={{
          width: 220,
          flexShrink: 0,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)',
        }}
      >
        <div
          style={{
            padding: '12px 14px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>메뉴 목록</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn sm ghost"
              title="엑셀 가져오기"
              onClick={() => setImportOpen(true)}
              style={{ fontSize: 11, padding: '3px 7px' }}
            >
              엑셀
            </button>
            <button className="btn sm ghost" onClick={() => setAddMenu(true)}>
              <Icon.plus style={{ width: 13, height: 13 }} />
            </button>
            <button
              className="btn sm ghost"
              title="전체 삭제"
              style={{ fontSize: 11, padding: '3px 7px', color: 'var(--danger)' }}
              onClick={async () => {
                const ok = await showConfirm({
                  message: '베이스 영양성분 전체(메뉴 목록 + 값)를 삭제합니다. 계속할까요?',
                  danger: true,
                });
                if (!ok) return;
                await clearAllBaseData();
                setSelMenu(null);
                showToast('전체 삭제 완료', 'ok');
                refresh();
              }}
            >
              전체삭제
            </button>
          </div>
        </div>
        {safeMenus.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>메뉴가 없어요</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+ 버튼으로 메뉴를 추가하세요</div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <MenuGroupList
              menus={safeMenus}
              rawMap={safeRawMap}
              menuMasters={safeMenuMasters}
              selMenu={selMenu}
              onSelect={setSelMenu}
            />
          </div>
        )}
      </div>

      {/* 영양성분 입력 패널 */}
      <div style={{ flex: 1 }}>
        <NutritionInputPanel
          selMenu={selMenu}
          selectedMenuName={selectedMenuName}
          selCrust={selCrust}
          setSelCrust={setSelCrust}
          safeRawMap={safeRawMap}
          masterByCode={masterByCode}
          form={form}
          setField={setField}
          saving={saving}
          autoCalcBusy={recipeCalc.autoCalcBusy}
          ingredientCalcLoading={ingredientCalc.ingredientCalcLoading}
          onAutoCalc={recipeCalc.handleAutoCalc}
          onOpenIngredientCalc={ingredientCalc.openIngredientCalc}
          onSave={handleSave}
          onDeleteMenu={handleDeleteMenu}
        />
      </div>

      {ingredientCalc.ingredientCalcOpen && (
        <IngredientCalcModal
          onClose={() => ingredientCalc.setIngredientCalcOpen(false)}
          selCrust={selCrust}
          saving={saving}
          ingredientCalcLoading={ingredientCalc.ingredientCalcLoading}
          ingredientCalcIngredients={ingredientCalc.ingredientCalcIngredients}
          ingredientNutritionMap={ingredientCalc.ingredientNutritionMap}
          ingredientCalcRows={ingredientCalc.ingredientCalcRows}
          ingredientCalcPreview={ingredientCalc.ingredientCalcPreview}
          addIngredientCalcRow={ingredientCalc.addIngredientCalcRow}
          updateIngredientCalcAmount={ingredientCalc.updateIngredientCalcAmount}
          removeIngredientCalcRow={ingredientCalc.removeIngredientCalcRow}
          buildIngredientCalcPreview={ingredientCalc.buildIngredientCalcPreview}
          applyIngredientCalc={ingredientCalc.applyIngredientCalc}
        />
      )}

      {/* 자동 계산 미리보기 모달 */}
      {recipeCalc.autoCalcPreview && (
        <AutoCalcPreviewModal
          autoCalcPreview={recipeCalc.autoCalcPreview}
          selectedMenuName={selectedMenuName}
          selCrust={selCrust}
          saving={saving}
          onApply={recipeCalc.handleApplyAutoCalc}
          onClose={() => recipeCalc.setAutoCalcPreview(null)}
        />
      )}

      {importOpen && (
        <ImportBaseModal
          menuMasters={menuMasters}
          menus={safeMenus}
          rawMap={safeRawMap}
          onClose={() => setImportOpen(false)}
          onRefresh={refresh}
        />
      )}

      {addMenu && (
        <AddMenuModal
          newMenuForm={newMenuForm}
          setNewMenuForm={setNewMenuForm}
          safeMenuMasters={safeMenuMasters}
          onAdd={handleAddMenu}
          onClose={() => setAddMenu(false)}
        />
      )}

      {confirmElement}
      {editorConfirmElement}
    </div>
  );
}
