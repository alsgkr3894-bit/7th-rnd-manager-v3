'use client';
import { useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteTopping, upsertTopping } from '@/lib/nutrition/values/store';
import { downloadToppingImportTemplate } from '@/lib/nutrition/values/topping-import';
import { asDisplayText, asObjectArray, noop } from '@/lib/ui/prop-guards';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ToppingEditModal } from './toppings/ToppingEditModal';
import { ToppingImportModal } from './toppings/ToppingImportModal';
import { ToppingsEmptyState } from './toppings/ToppingsEmptyState';
import { ToppingsHeader } from './toppings/ToppingsHeader';
import { ToppingsTable } from './toppings/ToppingsTable';
import * as utils from './toppings/toppingUtils';

export function TabToppings({ toppings, ingredients, onRefresh, canEdit = false }) {
  const { showConfirm, confirmElement } = useConfirmDialog();
  const safeToppings = useMemo(() => asObjectArray(toppings), [toppings]);
  const safeIngredients = useMemo(
    () => utils.normalizeToppingIngredients(ingredients),
    [ingredients]
  );
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(utils.EMPTY_TOPPING_FORM);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const ingredientLookups = useMemo(
    () => utils.buildToppingIngredientLookups(safeIngredients),
    [safeIngredients]
  );

  const openAdd = () => {
    if (!canEdit) return;
    setForm(utils.EMPTY_TOPPING_FORM);
    setValues({});
    setModal('add');
  };

  const openImport = () => {
    if (!canEdit) return;
    setImportOpen(true);
  };

  const downloadTemplate = () =>
    downloadToppingImportTemplate(safeIngredients).catch(err =>
      showToast(`양식 다운로드 실패: ${err?.message || err}`, 'error')
    );

  const openEdit = topping => {
    if (!canEdit) return;
    setForm(utils.toppingFormFromRecord(topping));
    setValues(utils.toppingValuesFromRecord(topping));
    setModal(topping);
  };

  const selectIngredient = ingredient => {
    const ingredientName = utils.normalizeToppingIngredientName(ingredient);
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
      await upsertTopping(utils.buildToppingSavePayload({ modal, form, values }));
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
      <ToppingsHeader
        onAdd={openAdd}
        onImport={openImport}
        onTemplate={downloadTemplate}
        canEdit={canEdit}
      />

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
      {canEdit && importOpen && (
        <ToppingImportModal
          toppings={safeToppings}
          ingredients={safeIngredients}
          onRefresh={refresh}
          onClose={() => setImportOpen(false)}
        />
      )}
      {confirmElement}
    </div>
  );
}
