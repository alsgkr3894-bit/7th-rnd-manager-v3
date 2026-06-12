'use client';
import { useState } from 'react';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';
import { upsertComposition, deleteComposition } from '@/lib/nutrition/values/store';
import { showToast } from '@/components/Toast';

function asAmountMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// firstMenuCode: 추가 모달 기본 baseMenuCode (호출 시 주입)
export function useDerivedCompositionForm({ onRefresh = () => {} } = {}) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    menuCode: '',
    menuName: '',
    baseMenuCode: '',
    ingredientCodes: [],
    ingredientAmounts: {},
  });
  const [saving, setSaving] = useState(false);

  const openAdd = (firstMenuCode = '') => {
    setForm({
      menuCode: '',
      menuName: '',
      baseMenuCode: firstMenuCode,
      ingredientCodes: [],
      ingredientAmounts: {},
    });
    setModal('add');
  };

  const openEdit = comp => {
    setForm({
      ...comp,
      ingredientCodes: asStringArray(comp.ingredientCodes),
      ingredientAmounts: asAmountMap(comp.ingredientAmounts),
    });
    setModal(comp);
  };

  const addIngredient = ingredient => {
    const code = asDisplayText(ingredient?.productCode);
    if (!code) return;
    setForm(f => ({
      ...f,
      ingredientCodes: asStringArray(f.ingredientCodes).includes(code)
        ? asStringArray(f.ingredientCodes)
        : [...asStringArray(f.ingredientCodes), code],
      ingredientAmounts: {
        ...asAmountMap(f.ingredientAmounts),
        [code]: {
          L: asAmountMap(f.ingredientAmounts)[code]?.L ?? '',
          R: asAmountMap(f.ingredientAmounts)[code]?.R ?? '',
        },
      },
    }));
  };

  const removeIngredient = code => {
    setForm(f => ({
      ...f,
      ingredientCodes: asStringArray(f.ingredientCodes).filter(item => item !== code),
      ingredientAmounts: Object.fromEntries(
        Object.entries(asAmountMap(f.ingredientAmounts)).filter(
          ([amountCode]) => amountCode !== code
        )
      ),
    }));
  };

  const updateIngredientAmount = (code, side, value) => {
    setForm(f => ({
      ...f,
      ingredientAmounts: {
        ...asAmountMap(f.ingredientAmounts),
        [code]: {
          ...asAmountMap(f.ingredientAmounts)[code],
          [side]: value,
        },
      },
    }));
  };

  const handleSaveComp = async () => {
    if (!String(form.menuName || '').trim()) {
      showToast('파생 메뉴명 입력 필요', 'error');
      return;
    }
    if (!form.baseMenuCode) {
      showToast('베이스 메뉴 선택 필요', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const code = String(form.menuCode || '').trim() || `DERIVED-${Date.now()}`;
      const ingredientCodes = asStringArray(form.ingredientCodes);
      const ingredientAmounts = Object.fromEntries(
        ingredientCodes.map(ingredientCode => [
          ingredientCode,
          asAmountMap(form.ingredientAmounts)[ingredientCode] || { L: '', R: '' },
        ])
      );
      await upsertComposition({
        ...(id ? { id } : {}),
        ...form,
        menuCode: code,
        ingredientCodes,
        ingredientAmounts,
        toppingCodes: [],
        toppingAmounts: {},
      });
      showToast('저장 완료', 'ok');
      setModal(null);
      await onRefresh();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComp = async comp => {
    if (
      !confirm(
        `'${asDisplayText(comp.menuName, '파생 메뉴')}' 및 연결된 영양정보가 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`
      )
    )
      return;
    try {
      await deleteComposition(comp.id);
      showToast(`'${asDisplayText(comp.menuName, '파생 메뉴')}' 삭제`, 'ok');
      await onRefresh();
    } catch (err) {
      showToast(`삭제 실패: ${err?.message || err}`, 'error');
    }
  };

  return {
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
  };
}
