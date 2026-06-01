'use client';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { ComboBox } from '@/components/ui/ComboBox';
import {
  getUserRules, addUserRule, deleteUserRule, updateUserRule,
  getClassificationNameOptions,
  CATEGORY_INPUT_OPTIONS as CATEGORY_OPTIONS,
} from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty, reapplyToUploadedData } from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';

const INITIAL_FORM = { rawMenuName: '', category: '피자', groupName: '', detailName: '' };

export function UserRulesSection() {
  const [nameOpts, setNameOpts] = useState({ groupNames: [], detailNames: [] });

  const {
    list, adding, setAdding, editingId, setEditingId, form, setForm, busy,
    handleAdd, handleUpdate, handleDelete, startEdit, resetAdding, refresh,
  } = useSettingsSection({
    initialForm:     INITIAL_FORM,
    getAll:          getUserRules,
    add:             (f) => addUserRule(f),
    update:          (id, f) => updateUserRule({ id, ...f }),
    remove:          deleteUserRule,
    getFormFromItem: (r) => ({
      rawMenuName: r.rawMenuName || r.pattern || '',
      category:    r.category    || '피자',
      groupName:   r.groupName   || '',
      detailName:  r.detailName  || '',
    }),
    validateAdd:    (f) => !!(f.rawMenuName.trim() && f.category && f.groupName.trim()),
    validateUpdate: (f) => !!(f.rawMenuName.trim() && f.category && f.groupName.trim()),
    messages:       { add: '규칙이 추가됐어요' },
  });

  useEffect(() => { loadNameOpts(); }, []);

  async function loadNameOpts() {
    try { setNameOpts(await getClassificationNameOptions()); } catch (err) { console.warn(err); }
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
        onAdd={resetAdding}
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
