'use client';
import { useState, useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { reapplyToUploadedData } from '@/components/sales/shared/SectionUtils';
import { asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 판매 설정 섹션 공통 CRUD 훅 (UserAliases · UserRules · UserExcluded).
 *
 * 공통 구조:
 *   - list / adding / editingId / form / busy state
 *   - refresh, handleAdd, handleUpdate, handleDelete, startEdit
 *   - 각 쓰기 성공 후 reapplyToUploadedData() 호출
 *
 * @param {{
 *   initialForm:    object,
 *   getAll:         () => Promise<object[]>,
 *   add:            (form: object) => Promise<void>,
 *   update:         (id: number, form: object) => Promise<void>,
 *   remove:         (id: number) => Promise<void>,
 *   getFormFromItem:(item: object) => object,
 *   validateAdd?:   (form: object) => boolean,
 *   validateUpdate?:(form: object) => boolean,
 *   messages?:      { add?: string, update?: string, delete?: string },
 * }}
 */
export function useSettingsSection({
  initialForm,
  getAll,
  add,
  update,
  remove,
  getFormFromItem,
  validateAdd = () => true,
  validateUpdate = () => true,
  messages = {},
}) {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    try {
      const rows = await getAll();
      if (mountedRef.current) setList(asObjectArray(rows));
    } catch (err) {
      console.warn(err);
    }
  }

  async function handleAdd() {
    if (!validateAdd(form)) return;
    setBusy(true);
    try {
      await add(form);
      showToast(messages.add || '추가됐어요', 'ok');
      setForm(initialForm);
      setAdding(false);
      setPendingDeleteId(null);
      refresh();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '추가 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id) {
    if (!validateUpdate(form)) return;
    setBusy(true);
    try {
      await update(id, form);
      showToast(messages.update || '수정됐어요', 'ok');
      setEditingId(null);
      setPendingDeleteId(null);
      refresh();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(id) {
    setPendingDeleteId(id);
    setEditingId(null);
    setAdding(false);
  }

  function cancelDelete() {
    setPendingDeleteId(null);
  }

  async function confirmDelete(id = pendingDeleteId) {
    if (id == null) return;
    setBusy(true);
    try {
      await remove(id);
      showToast(messages.delete || '삭제됐어요', 'ok');
      setPendingDeleteId(null);
      refresh();
      await reapplyToUploadedData();
    } catch {
      showToast(messages.deleteError || '삭제 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    if (!item || typeof item !== 'object' || item.id == null) return;

    setEditingId(item.id);
    setPendingDeleteId(null);
    setAdding(false);
    const nextForm = getFormFromItem(item);
    setForm(nextForm && typeof nextForm === 'object' ? nextForm : initialForm);
  }

  function resetAdding() {
    setAdding(v => !v);
    setEditingId(null);
    setPendingDeleteId(null);
    setForm(initialForm);
  }

  /** 탭 전환·검색어 변경 등 외부에서 편집 상태를 강제 해제할 때 사용 */
  function cancelEdit() {
    setEditingId(null);
    setPendingDeleteId(null);
    setAdding(false);
    setForm(initialForm);
  }

  return {
    list,
    adding,
    setAdding,
    editingId,
    setEditingId,
    form,
    setForm,
    busy,
    pendingDeleteId,
    refresh,
    handleAdd,
    handleUpdate,
    requestDelete,
    cancelDelete,
    confirmDelete,
    handleDelete: requestDelete,
    startEdit,
    resetAdding,
    cancelEdit,
  };
}
