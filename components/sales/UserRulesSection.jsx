'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { ComboBox } from '@/components/ui/ComboBox';
import {
  getUserRules, addUserRule, deleteUserRule, updateUserRule,
  getClassificationNameOptions,
  CATEGORY_INPUT_OPTIONS as CATEGORY_OPTIONS,
} from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty, reapplyToUploadedData } from './shared/SectionUtils';

export function UserRulesSection() {
  const [list,      setList]      = useState([]);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState({ rawMenuName: '', category: '피자', groupName: '', detailName: '' });
  const [busy,      setBusy]      = useState(false);
  const [nameOpts,  setNameOpts]  = useState({ groupNames: [], detailNames: [] });

  useEffect(() => { refresh(); loadNameOpts(); }, []);

  async function refresh() {
    try { setList(await getUserRules()); } catch (err) { console.warn(err); }
  }

  async function loadNameOpts() {
    try { setNameOpts(await getClassificationNameOptions()); } catch (err) { console.warn(err); }
  }

  function resetForm() {
    setForm({ rawMenuName: '', category: '피자', groupName: '', detailName: '' });
  }

  async function handleAdd() {
    if (!form.rawMenuName.trim() || !form.category || !form.groupName.trim()) return;
    setBusy(true);
    try {
      await addUserRule(form);
      showToast('규칙이 추가됐어요', 'ok');
      resetForm(); setAdding(false);
      refresh(); loadNameOpts();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '추가 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleUpdate(id) {
    if (!form.rawMenuName.trim() || !form.category || !form.groupName.trim()) return;
    setBusy(true);
    try {
      await updateUserRule({ id, ...form });
      showToast('수정됐어요', 'ok');
      setEditingId(null);
      refresh(); loadNameOpts();
      await reapplyToUploadedData();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally { setBusy(false); }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      rawMenuName: r.rawMenuName || r.pattern || '',
      category:    r.category    || '피자',
      groupName:   r.groupName   || '',
      detailName:  r.detailName  || '',
    });
  }

  async function handleDelete(id) {
    try {
      await deleteUserRule(id); showToast('삭제됐어요', 'ok');
      refresh(); loadNameOpts();
      await reapplyToUploadedData();
    } catch { showToast('삭제 실패', 'err'); }
  }

  async function handleToggle(r) {
    try {
      await updateUserRule({ id: r.id, enable: r.enable !== false ? false : true });
      refresh();
      await reapplyToUploadedData();
    } catch { showToast('토글 실패', 'err'); }
  }

  return (
    <div style={{marginBottom:16}}>
      <SectionHeader
        title="사용자 추가 규칙"
        count={list.length}
        adding={adding}
        onAdd={() => { setAdding(v => !v); setEditingId(null); resetForm(); }}
      />

      {adding && (
        <RowForm form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={handleAdd} busy={busy} nameOpts={nameOpts}/>
      )}

      {list.length === 0 && !adding ? (
        <SectionEmpty>사용자 추가 규칙이 아직 없습니다</SectionEmpty>
      ) : list.length > 0 && (
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th>패턴</th>
                <th style={{width:120}}>카테고리</th>
                <th style={{width:140}}>중분류</th>
                <th style={{width:140}}>상세</th>
                <th style={{width:80, textAlign:'center'}}>활성</th>
                <th style={{width:130}}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => editingId === r.id ? (
                <tr key={r.id}>
                  <td colSpan={6} style={{padding:8}}>
                    <RowForm form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={() => handleUpdate(r.id)} busy={busy} submitLabel="저장" nameOpts={nameOpts}/>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} style={{opacity: r.enable === false ? 0.5 : 1}}>
                  <td className="cell-name"><div className="menu-name">{r.rawMenuName || r.pattern}</div></td>
                  <td><span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>{r.category}</span></td>
                  <td>{r.groupName}</td>
                  <td style={{color:'var(--text-3)', fontSize:12}}>{r.detailName || '-'}</td>
                  <td style={{textAlign:'center'}}>
                    <Toggle value={r.enable !== false} onChange={() => handleToggle(r)} />
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn sm" onClick={() => startEdit(r)}>수정</button>
                    {' '}
                    <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => handleDelete(r.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowForm({ form, setForm, onCancel, onSubmit, busy, submitLabel = '추가', nameOpts = { groupNames: [], detailNames: [], byCategory: {} } }) {
  // 선택한 대분류(category)에 속한 중분류·상세만 자동완성 후보로
  const catOpts = nameOpts.byCategory?.[form.category] || { groupNames: [], detailNames: [] };
  return (
    <div style={{display:'grid', gridTemplateColumns:'1.5fr 140px 1fr 1fr auto auto', gap:8}}>
      <input value={form.rawMenuName} onChange={e => setForm({ ...form, rawMenuName: e.target.value })} placeholder="패턴 (정규화 후)" style={inputStyle}/>
      <select value={form.category}   onChange={e => setForm({ ...form, category:    e.target.value })} style={inputStyle}>
        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <ComboBox value={form.groupName}  onChange={v => setForm({ ...form, groupName: v })}  options={catOpts.groupNames}  placeholder="중분류"      inputStyle={inputStyle}/>
      <ComboBox value={form.detailName} onChange={v => setForm({ ...form, detailName: v })} options={catOpts.detailNames} placeholder="상세 (선택)" inputStyle={inputStyle}/>
      <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
      <button className="btn sm primary" onClick={onSubmit}
        disabled={busy || !form.rawMenuName.trim() || !form.category || !form.groupName.trim()}>
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}
