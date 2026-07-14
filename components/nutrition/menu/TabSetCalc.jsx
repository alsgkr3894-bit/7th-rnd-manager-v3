'use client';
/* eslint-disable react/no-unescaped-entities */
import { useMemo } from 'react';
import { isPersonalPizzaMenu, resolveNutritionGroup } from '@/lib/nutrition/menu-group';
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

  // 1인용 피자는 한 사람 몫의 완제품이라 반반 결합 대상이 아니므로 하프앤하프 후보에서 제외한다.
  // (세트박스의 피자 슬롯은 그대로 1인용을 포함할 수 있어 pizzaMenus는 건드리지 않는다.)
  const halfPizzaMenus = useMemo(
    () => pizzaMenus.filter(m => !isPersonalPizzaMenu(m, masterByCode)),
    [pizzaMenus, masterByCode]
  );

  const halfResult = useMemo(
    () => calcHalfMinMax(halfPizzaMenus, safeRawMap, safeEdgeMap),
    [halfPizzaMenus, safeRawMap, safeEdgeMap]
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

  // 세트박스는 L/R이 각각 별도 레코드지만, 화면에서는 세트명 하나로 묶어
  // L세트/R세트를 한 번에 추가·편집하고 양쪽 열량을 함께 보여준다.
  const groupedSets = useMemo(() => {
    const map = new Map();
    setsWithCalc.forEach(comp => {
      const key = asDisplayText(comp.setName, '');
      if (!map.has(key)) map.set(key, { setName: key, L: null, R: null });
      map.get(key)[comp.setSide] = comp;
    });
    return [...map.values()];
  }, [setsWithCalc]);

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <HalfAndHalfCard pizzaMenus={halfPizzaMenus} halfResult={halfResult} />

      <SetCompositionList
        groups={groupedSets}
        menus={safeMenus}
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
