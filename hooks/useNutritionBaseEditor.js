'use client';
import { useState, useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { asDisplayText } from '@/lib/ui/prop-guards';
import {
  upsertMenuRef,
  deleteMenuRef,
  upsertRawValue,
  CRUST_TYPES,
} from '@/lib/nutrition/values/store';
import { SERVING_CRUST_TYPE } from '@/lib/nutrition/crust-config';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { buildNutritionMenuRefPayload } from '@/lib/nutrition/menu-ref-policy';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

/**
 * 베이스 영양성분 에디터의 핵심 상태와 메뉴 CRUD/저장 로직.
 * 레시피·식자재 계산 훅은 여기서 노출하는 selMenu/selCrust/form/setForm/setSaving를 공유한다.
 */
export function useNutritionBaseEditor({ safeRawMap, refresh, canEdit = false }) {
  const { showConfirm, confirmElement } = useConfirmDialog();
  const [selMenu, setSelMenu] = useState(null);
  const [selCrust, setSelCrust] = useState(CRUST_TYPES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({
    menuCode: '',
    menuName: '',
    category: '피자',
    displayOrder: '',
  });

  const isServingMenu = selMenu ? resolveNutritionGroup(selMenu) !== '피자' : false;
  const effectiveCrust = isServingMenu ? SERVING_CRUST_TYPE : selCrust;
  const key = selMenu ? `${selMenu.menuCode}__${effectiveCrust}` : null;
  const existing =
    key && isServingMenu
      ? safeRawMap[key] || safeRawMap[`${selMenu.menuCode}__석쇠L`] || null
      : key
        ? safeRawMap[key]
        : null;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (existing) setForm({ ...existing });
    else setForm({});
  }, [existing, selMenu, selCrust]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!canEdit) return;
    if (!selMenu) return;
    setSaving(true);
    try {
      await upsertRawValue({
        ...(existing?.id ? { id: existing.id } : {}),
        menuCode: selMenu.menuCode,
        menuName: selMenu.menuName,
        crustType: effectiveCrust,
        ...form,
      });
      if (!mountedRef.current) return;
      showToast('저장 완료', 'ok');
      refresh();
    } catch {
      if (mountedRef.current) showToast('저장 실패', 'error');
    }
    if (mountedRef.current) setSaving(false);
  };

  const handleAddMenu = async () => {
    if (!canEdit) return;
    let payload;
    try {
      payload = buildNutritionMenuRefPayload(newMenuForm);
    } catch (err) {
      showToast(err?.message || '메뉴 추가 실패', 'error');
      return;
    }
    await upsertMenuRef(payload);
    showToast('메뉴 추가 완료', 'ok');
    setAddMenu(false);
    setNewMenuForm({ menuCode: '', menuName: '', category: '피자', displayOrder: '' });
    refresh();
  };

  const handleDeleteMenu = async menu => {
    if (!canEdit) return;
    const ok = await showConfirm({
      message: `'${asDisplayText(menu.menuName, '메뉴')}' 및 모든 영양성분값이 삭제됩니다. 계속할까요?`,
      danger: true,
    });
    if (!ok) return;
    await deleteMenuRef(menu.id, menu.menuCode);
    if (selMenu?.id === menu.id) setSelMenu(null);
    showToast(`'${asDisplayText(menu.menuName, '메뉴')}' 삭제`, 'ok');
    refresh();
  };

  return {
    selMenu,
    setSelMenu,
    selCrust,
    setSelCrust,
    form,
    setForm,
    setField,
    saving,
    setSaving,
    existing,
    addMenu,
    setAddMenu,
    newMenuForm,
    setNewMenuForm,
    handleSave,
    handleAddMenu,
    handleDeleteMenu,
    confirmElement,
  };
}
