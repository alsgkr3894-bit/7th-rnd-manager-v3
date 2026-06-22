'use client';
import { useMemo } from 'react';
import { asDisplayText, asObjectArray, noop } from '@/lib/ui/prop-guards';
import { useDerivedCompositionForm } from '@/hooks/useDerivedCompositionForm';
import { DerivedCompositionList } from './derived/DerivedCompositionList';
import { DerivedCompositionModal } from './derived/DerivedCompositionModal';
import {
  buildIngredientMetaByCode,
  buildIngredientOptions,
  buildMasterByCode,
  buildMenuByCode,
  filterDerivedCompositions,
  groupDerivedCompositions,
} from './derived/derivedCompositionUtils';

export function TabDerived({
  menus,
  ingredients,
  compositions,
  onRefresh,
  menuMasters,
  menuSearch = '',
  onOpenBase,
  canEdit = false,
}) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeIngredients = useMemo(() => asObjectArray(ingredients), [ingredients]);
  const safeCompositions = useMemo(() => asObjectArray(compositions), [compositions]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const openBaseTab = typeof onOpenBase === 'function' ? onOpenBase : noop;

  const {
    modal,
    setModal,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    addIngredient,
    removeIngredient,
    updateIngredientAmount,
    handleSaveComp,
    handleDeleteComp,
    confirmElement,
  } = useDerivedCompositionForm({ onRefresh: refresh, canEdit });

  const masterByCode = useMemo(() => buildMasterByCode(safeMenuMasters), [safeMenuMasters]);
  const menuByCode = useMemo(() => buildMenuByCode(safeMenus), [safeMenus]);
  const ingredientMetaByCode = useMemo(
    () => buildIngredientMetaByCode(safeIngredients),
    [safeIngredients]
  );
  const ingredientOptions = useMemo(
    () => buildIngredientOptions(safeIngredients),
    [safeIngredients]
  );
  const searchText = asDisplayText(menuSearch).trim().toLowerCase();

  const visibleCompositions = useMemo(() => {
    return filterDerivedCompositions({
      compositions: safeCompositions,
      searchText,
      menuByCode,
      ingredientMetaByCode,
    });
  }, [safeCompositions, searchText, menuByCode, ingredientMetaByCode]);

  const groupedCompositions = useMemo(() => {
    return groupDerivedCompositions({
      compositions: visibleCompositions,
      menuByCode,
      masterByCode,
    });
  }, [visibleCompositions, menuByCode, masterByCode]);

  return (
    <div style={{ marginTop: 20 }}>
      <DerivedCompositionList
        compositions={safeCompositions}
        groupedCompositions={groupedCompositions}
        menuByCode={menuByCode}
        ingredientMetaByCode={ingredientMetaByCode}
        defaultBaseMenuCode={asDisplayText(safeMenus[0]?.menuCode)}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDeleteComp}
        canEdit={canEdit}
      />
      {canEdit && (
        <DerivedCompositionModal
          modal={modal}
          form={form}
          setForm={setForm}
          safeMenus={safeMenus}
          ingredientOptions={ingredientOptions}
          ingredientMetaByCode={ingredientMetaByCode}
          saving={saving}
          onClose={() => setModal(null)}
          onOpenBaseTab={openBaseTab}
          onAddIngredient={addIngredient}
          onRemoveIngredient={removeIngredient}
          onUpdateIngredientAmount={updateIngredientAmount}
          onSave={handleSaveComp}
        />
      )}
      {confirmElement}
    </div>
  );
}
