'use client';
/* eslint-disable react/no-unescaped-entities */
import { useMemo } from 'react';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import { asDisplayText, asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';
import { useSetCompositionForm } from '@/hooks/useSetCompositionForm';
import { HalfAndHalfCard } from './set-calc/HalfAndHalfCard';
import { SetCompositionList } from './set-calc/SetCompositionList';
import { SetCompositionModal } from './set-calc/SetCompositionModal';

export function TabSetCalc({
  menus,
  rawMap,
  edgeMap,
  setComps,
  menuMasters,
  onRefresh,
  canEdit = false,
}) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeSetComps = useMemo(() => asObjectArray(setComps), [setComps]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const safeEdgeMap = asRecord(edgeMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;

  const {
    modal,
    setModal,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    addSlot,
    removeSlot,
    updateSlot,
    handleSave,
    handleDelete,
    confirmElement,
  } = useSetCompositionForm({ onRefresh: refresh, canEdit });

  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );

  const pizzaMenus = useMemo(
    () => safeMenus.filter(m => resolveNutritionGroup(m, masterByCode) === '피자'),
    [safeMenus, masterByCode]
  );

  const nonPizzaMenus = useMemo(
    () => safeMenus.filter(m => resolveNutritionGroup(m, masterByCode) !== '피자'),
    [safeMenus, masterByCode]
  );

  const halfResult = useMemo(
    () => calcHalfMinMax(pizzaMenus, safeRawMap, safeEdgeMap),
    [pizzaMenus, safeRawMap, safeEdgeMap]
  );

  const setsWithCalc = useMemo(() => {
    return safeSetComps
      .filter(c => c.kind === 'set')
      .filter(c => ['L', 'R'].includes(asDisplayText(c.setSide)))
      .map(comp => {
        const result = calcSetMinMax(
          Array.isArray(comp.slots) ? comp.slots : [],
          safeMenus,
          safeRawMap,
          masterByCode,
          pizzaMenus,
          safeEdgeMap
        );
        const side = asDisplayText(comp.setSide, 'L') === 'R' ? 'R' : 'L';
        return {
          ...comp,
          setSide: side,
          ...result,
          selectedResult: result.bySize?.[side] || { minKcal: null, maxKcal: null },
        };
      });
  }, [safeSetComps, safeMenus, safeRawMap, safeEdgeMap, masterByCode, pizzaMenus]);

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <HalfAndHalfCard pizzaMenus={pizzaMenus} halfResult={halfResult} />

      <SetCompositionList
        setsWithCalc={setsWithCalc}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        canEdit={canEdit}
      />

      {canEdit && modal && (
        <SetCompositionModal
          mode={modal}
          form={form}
          setForm={setForm}
          saving={saving}
          allMenus={nonPizzaMenus}
          safeMenus={safeMenus}
          safeRawMap={safeRawMap}
          safeEdgeMap={safeEdgeMap}
          masterByCode={masterByCode}
          pizzaMenus={pizzaMenus}
          onClose={() => setModal(null)}
          onAddSlot={addSlot}
          onRemoveSlot={removeSlot}
          onUpdateSlot={updateSlot}
          onSave={handleSave}
        />
      )}
      {confirmElement}
    </div>
  );
}
