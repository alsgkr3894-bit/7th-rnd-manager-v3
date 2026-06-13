'use client';
import { useState } from 'react';
import { asDisplayText, noop } from '@/lib/ui/prop-guards';
import { upsertSetComposition, deleteSetComposition } from '@/lib/nutrition/values/store';
import { showToast } from '@/components/Toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export function useSetCompositionForm({ onRefresh = noop } = {}) {
  const { showConfirm, confirmElement } = useConfirmDialog();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    setCode: '',
    setName: '',
    kind: 'set',
    setSide: 'L',
    slots: [],
  });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm({ setCode: '', setName: '', kind: 'set', setSide: 'L', slots: [] });
    setModal('add');
  };

  const openEdit = comp => {
    setForm({
      ...comp,
      setSide: asDisplayText(comp.setSide, 'L') === 'R' ? 'R' : 'L',
      slots: Array.isArray(comp.slots) ? comp.slots : [],
    });
    setModal(comp);
  };

  const addSlot = () =>
    setForm(f => ({
      ...f,
      slots: [...(Array.isArray(f.slots) ? f.slots : []), { label: '', menuCodes: [] }],
    }));

  const removeSlot = i =>
    setForm(f => ({
      ...f,
      slots: (Array.isArray(f.slots) ? f.slots : []).filter((_, idx) => idx !== i),
    }));

  const updateSlot = (i, patch) =>
    setForm(f => ({
      ...f,
      slots: (Array.isArray(f.slots) ? f.slots : []).map((s, idx) =>
        idx === i ? { ...s, ...patch } : s
      ),
    }));

  const handleSave = async () => {
    if (!String(form.setName || '').trim()) {
      showToast('세트명 입력 필요', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const side = asDisplayText(form.setSide, 'L') === 'R' ? 'R' : 'L';
      const code = String(form.setCode || '').trim() || `SET-${side}-${Date.now()}`;
      await upsertSetComposition({
        ...(id ? { id } : {}),
        ...form,
        kind: 'set',
        setSide: side,
        setCode: code,
      });
      showToast('저장 완료', 'ok');
      setModal(null);
      onRefresh();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async comp => {
    const ok = await showConfirm({
      message: `'${comp.setName || '세트'}' 세트가 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`,
      danger: true,
    });
    if (!ok) return;
    await deleteSetComposition(comp.id);
    showToast(`'${comp.setName}' 삭제`, 'ok');
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
