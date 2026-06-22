'use client';
import { useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteTopping, upsertTopping } from '@/lib/nutrition/values/store';
import { asDisplayText, asObjectArray, noop } from '@/lib/ui/prop-guards';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ToppingEditModal } from './toppings/ToppingEditModal';
import { ToppingsEmptyState } from './toppings/ToppingsEmptyState';
import { ToppingsHeader } from './toppings/ToppingsHeader';
import { ToppingsTable } from './toppings/ToppingsTable';
import {
  buildToppingIngredientLookups,
  buildToppingSavePayload,
  EMPTY_TOPPING_FORM,
  normalizeToppingIngredientName,
  normalizeToppingIngredients,
  toppingFormFromRecord,
  toppingValuesFromRecord,
} from './toppings/toppingUtils';

export function TabToppings({ toppings, ingredients, onRefresh, canEdit = false }) {
  const { showConfirm, confirmElement } = useConfirmDialog();
  const safeToppings = useMemo(() => asObjectArray(toppings), [toppings]);
  const safeIngredients = useMemo(() => normalizeToppingIngredients(ingredients), [ingredients]);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_TOPPING_FORM);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const ingredientLookups = useMemo(
    () => buildToppingIngredientLookups(safeIngredients),
    [safeIngredients]
  );

  const openAdd = () => {
    if (!canEdit) return;
    setForm(EMPTY_TOPPING_FORM);
    setValues({});
    setModal('add');
  };

  const openEdit = topping => {
    if (!canEdit) return;
    setForm(toppingFormFromRecord(topping));
    setValues(toppingValuesFromRecord(topping));
    setModal(topping);
  };

  const selectIngredient = ingredient => {
    const ingredientName = normalizeToppingIngredientName(ingredient);
    setForm(prev => ({
      ...prev,
      productCode: asDisplayText(ingredient.productCode),
      ingredientName,
      toppingName: prev.toppingName || ingredientName,
    }));
  };

  const clearIngredient = () => {
    setForm(prev => ({ ...prev, productCode: '', ingredientName: '' }));
  };

  const save = async () => {
    if (!canEdit) return;
    const toppingName = asDisplayText(form.toppingName).trim();
    if (!toppingName) {
      showToast('추가토핑명을 입력해주세요', 'error');
      return;
    }
    setSaving(true);
    try {
      await upsertTopping(buildToppingSavePayload({ modal, form, values }));
      showToast('추가토핑 저장 완료', 'ok');
      setModal(null);
      await refresh();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async topping => {
    if (!canEdit) return;
    const name = asDisplayText(topping.toppingName, '추가토핑');
    const ok = await showConfirm({ message: `'${name}' 추가토핑을 삭제할까요?`, danger: true });
    if (!ok) return;
    await deleteTopping(topping.id);
    showToast('삭제 완료', 'ok');
    refresh();
  };

  return (
    <div style={{ marginTop: 20 }}>
      <ToppingsHeader onAdd={openAdd} canEdit={canEdit} />

      {safeToppings.length === 0 ? (
        <ToppingsEmptyState />
      ) : (
        <ToppingsTable
          toppings={safeToppings}
          lookups={ingredientLookups}
          onEdit={openEdit}
          onRemove={remove}
          canEdit={canEdit}
        />
      )}

      {canEdit && modal && (
        <ToppingEditModal
          modal={modal}
          form={form}
          onForm={setForm}
          values={values}
          onValues={setValues}
          safeIngredients={safeIngredients}
          onIngredient={selectIngredient}
          onClearIngredient={clearIngredient}
          saving={saving}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
      {confirmElement}
    </div>
  );
}
