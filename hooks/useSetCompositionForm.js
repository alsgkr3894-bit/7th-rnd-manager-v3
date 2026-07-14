'use client';
import { useState } from 'react';
import { asDisplayText, noop } from '@/lib/ui/prop-guards';
import { upsertSetComposition, deleteSetComposition } from '@/lib/nutrition/values/store';
import { showToast } from '@/components/Toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const emptySide = () => ({ id: undefined, setCode: '', slots: [] });
const emptyForm = () => ({ setName: '', L: emptySide(), R: emptySide() });

export function useSetCompositionForm({ onRefresh = noop, canEdit = false } = {}) {
  const { showConfirm, confirmElement } = useConfirmDialog();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    if (!canEdit) return;
    setForm(emptyForm());
    setModal('add');
  };

  const openEdit = group => {
    if (!canEdit) return;
    const sideForm = comp =>
      comp
        ? {
            id: comp.id,
            setCode: asDisplayText(comp.setCode),
            slots: Array.isArray(comp.slots) ? comp.slots : [],
          }
        : emptySide();
    setForm({
      setName: asDisplayText(group.setName),
      L: sideForm(group.L),
      R: sideForm(group.R),
    });
    setModal(group);
  };

  const addSlot = side =>
    setForm(f => ({
      ...f,
      [side]: {
        ...f[side],
        slots: [...(Array.isArray(f[side].slots) ? f[side].slots : []), { menuCodes: [] }],
      },
    }));

  const removeSlot = (side, i) =>
    setForm(f => ({
      ...f,
      [side]: {
        ...f[side],
        slots: (Array.isArray(f[side].slots) ? f[side].slots : []).filter((_, idx) => idx !== i),
      },
    }));

  const updateSlot = (side, i, patch) =>
    setForm(f => ({
      ...f,
      [side]: {
        ...f[side],
        slots: (Array.isArray(f[side].slots) ? f[side].slots : []).map((s, idx) =>
          idx === i ? { ...s, ...patch } : s
        ),
      },
    }));

  const handleSave = async () => {
    if (!canEdit) return;
    if (!String(form.setName || '').trim()) {
      showToast('세트명 입력 필요', 'error');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        ['L', 'R'].map(side => {
          const sideForm = form[side] || emptySide();
          const code = String(sideForm.setCode || '').trim() || `SET-${side}-${Date.now()}`;
          return upsertSetComposition({
            ...(sideForm.id ? { id: sideForm.id } : {}),
            setName: form.setName,
            kind: 'set',
            setSide: side,
            setCode: code,
            slots: Array.isArray(sideForm.slots) ? sideForm.slots : [],
          });
        })
      );
      showToast('저장 완료', 'ok');
      setModal(null);
      onRefresh();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async group => {
    if (!canEdit) return;
    const ok = await showConfirm({
      message: `'${group.setName || '세트'}' 세트가 L/R 모두 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`,
      danger: true,
    });
    if (!ok) return;
    const ids = ['L', 'R'].map(side => group[side]?.id).filter(Boolean);
    await Promise.all(ids.map(id => deleteSetComposition(id)));
    showToast(`'${group.setName}' 삭제`, 'ok');
    onRefresh();
  };

  return {
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
  };
}
