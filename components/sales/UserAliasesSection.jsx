'use client';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { getUserAliases, addUserAlias, deleteUserAlias, updateUserAlias } from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty } from './shared/SectionUtils';

export function UserAliasesSection() {
  const [list,      setList]      = useState([]);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState({ rawName: '', mappedName: '' });
  const [busy,      setBusy]      = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { setList(await getUserAliases()); } catch (err) { console.warn(err); }
  }

  async function handleAdd() {
    if (!form.rawName.trim() || !form.mappedName.trim()) return;
    setBusy(true);
    try {
      await addUserAlias({ rawName: form.rawName, mappedName: form.mappedName });
      showToast('별칭이 추가됐어요', 'ok');
      setForm({ rawName: '', mappedName: '' });
      setAdding(false);
      refresh();
    } catch (err) {
      showToast(err?.message || '추가 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleUpdate(id) {
    if (!form.rawName.trim() || !form.mappedName.trim()) return;
    setBusy(true);
    try {
      await updateUserAlias({ id, rawName: form.rawName, mappedName: form.mappedName });
      showToast('수정됐어요', 'ok');
      setEditingId(null);
      refresh();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally { setBusy(false); }
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({ rawName: a.rawName, mappedName: a.mappedName });
  }

  async function handleDelete(id) {
    try { await deleteUserAlias(id); showToast('삭제됐어요', 'ok'); refresh(); }
    catch { showToast('삭제 실패', 'err'); }
  }

  async function handleToggle(a) {
    try {
      await updateUserAlias({ id: a.id, enable: a.enable !== false ? false : true });
      refresh();
    } catch { showToast('토글 실패', 'err'); }
  }

  return (
    <div style={{marginBottom:16}}>
      <SectionHeader
        title="사용자 추가 별칭"
        count={list.length}
        adding={adding}
        onAdd={() => { setAdding(v => !v); setEditingId(null); setForm({ rawName: '', mappedName: '' }); }}
      />

      {adding && (
        <RowForm form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={handleAdd} busy={busy}/>
      )}

      {list.length === 0 && !adding ? (
        <SectionEmpty>사용자 추가 별칭이 아직 없습니다</SectionEmpty>
      ) : list.length > 0 && (
        <table className="data-table">
          <thead><tr>
            <th>입력</th><th>출력 (표준)</th>
            <th style={{width:80, textAlign:'center'}}>활성</th>
            <th style={{width:140}}></th>
          </tr></thead>
          <tbody>
            {list.map(a => editingId === a.id ? (
              <tr key={a.id}>
                <td colSpan={4} style={{padding:8}}>
                  <RowForm form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={() => handleUpdate(a.id)} busy={busy} submitLabel="저장"/>
                </td>
              </tr>
            ) : (
              <tr key={a.id} style={{opacity: a.enable === false ? 0.5 : 1}}>
                <td className="cell-name"><div className="menu-name">{a.rawName}</div></td>
                <td><b>{a.mappedName}</b></td>
                <td style={{textAlign:'center'}}>
                  <Toggle value={a.enable !== false} onChange={() => handleToggle(a)} />
                </td>
                <td style={{textAlign:'right'}}>
                  <button className="btn sm" onClick={() => startEdit(a)}>수정</button>
                  {' '}
                  <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => handleDelete(a.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RowForm({ form, setForm, onCancel, onSubmit, busy, submitLabel = '추가' }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8}}>
      <input value={form.rawName}    onChange={e => setForm({ ...form, rawName:    e.target.value })} placeholder="입력 (정규화 후)" style={inputStyle}/>
      <input value={form.mappedName} onChange={e => setForm({ ...form, mappedName: e.target.value })} placeholder="표준 메뉴명"    style={inputStyle}/>
      <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
      <button className="btn sm primary" onClick={onSubmit} disabled={busy || !form.rawName.trim() || !form.mappedName.trim()}>
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}
