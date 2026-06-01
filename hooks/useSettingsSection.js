'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { reapplyToUploadedData } from '@/components/sales/shared/SectionUtils';

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
  validateAdd   = () => true,
  validateUpdate = () => true,
  messages = {},
}) {
  const [list,      setList]      = useState([]);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(initialForm);
  const [busy,      setBusy]      = useState(false);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    try { setList(await getAll()); } catch (err) { console.warn(err); }
  }

  async function handleAdd() {
    if (!validateAdd(form)) return;
    setBusy(true);
    try {
      await add(form);
      showToast(messages.add || '추가됐어요', 'ok');
      setForm(initialForm);
      setAdding(false);
      refresh();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '추가 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleUpdate(id) {
    if (!validateUpdate(form)) return;
    setBusy(true);
    try {
      await update(id, form);
      showToast(messages.update || '수정됐어요', 'ok');
      setEditingId(null);
      refresh();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleDelete(id) {
    try {
      await remove(id);
      showToast(messages.delete || '삭제됐어요', 'ok');
      refresh();
      await reapplyToUploadedData();
    } catch { showToast('삭제 실패', 'err'); }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm(getFormFromItem(item));
  }

  function resetAdding() {
    setAdding(v => !v);
    setEditingId(null);
    setForm(initialForm);
  }

  return {
    list, adding, setAdding, editingId, setEditingId,
    form, setForm, busy,
    refresh, handleAdd, handleUpdate, handleDelete, startEdit, resetAdding,
  };
}
