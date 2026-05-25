'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { getUserRules, addUserRule, deleteUserRule, updateUserRule } from '@/lib/sales';

const CATEGORY_OPTIONS = ['피자', '1인피자', '사이드', '사이드(소스)', '엣지&도우', '세트메뉴', '하프앤하프', '추가토핑', '음료', '품목제외'];

/**
 * UserRulesSection — 사용자 추가 분류 규칙 CRUD + enable 토글 + 수정
 */
export function UserRulesSection() {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ rawMenuName: '', category: '피자', groupName: '', detailName: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { setList(await getUserRules()); } catch (err) { console.warn(err); }
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
      refresh();
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
      refresh();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally { setBusy(false); }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({
      rawMenuName: r.rawMenuName || r.pattern || '',
      category: r.category || '피자',
      groupName: r.groupName || '',
      detailName: r.detailName || '',
    });
  }

  async function handleDelete(id) {
    try { await deleteUserRule(id); showToast('삭제됐어요', 'ok'); refresh(); }
    catch { showToast('삭제 실패', 'err'); }
  }

  async function handleToggle(r) {
    try {
      await updateUserRule({ id: r.id, enable: r.enable === false ? true : false });
      refresh();
    } catch { showToast('토글 실패', 'err'); }
  }

  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <div style={{fontSize:13, fontWeight:700}}>
          사용자 추가 규칙 <span style={{color:'var(--text-3)', fontWeight:500, marginLeft:6}}>{list.length}개</span>
        </div>
        <button className="btn sm" onClick={() => { setAdding(v => !v); setEditingId(null); resetForm(); }}>
          {adding ? '닫기' : <><Icon.plus style={{width:12, height:12}}/> 추가</>}
        </button>
      </div>

      {adding && (
        <RowForm form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={handleAdd} busy={busy}/>
      )}

      {list.length === 0 && !adding ? (
        <div style={{padding:'16px 0', textAlign:'center', color:'var(--text-3)', fontSize:12}}>
          사용자 추가 규칙이 아직 없습니다
        </div>
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
                    <RowForm form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={() => handleUpdate(r.id)} busy={busy} submitLabel="저장"/>
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

function RowForm({ form, setForm, onCancel, onSubmit, busy, submitLabel = '추가' }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'1.5fr 140px 1fr 1fr auto auto', gap:8}}>
      <input value={form.rawMenuName} onChange={e => setForm({ ...form, rawMenuName: e.target.value })} placeholder="패턴 (정규화 후)" style={inputStyle}/>
      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={form.groupName} onChange={e => setForm({ ...form, groupName: e.target.value })} placeholder="중분류" style={inputStyle}/>
      <input value={form.detailName} onChange={e => setForm({ ...form, detailName: e.target.value })} placeholder="상세 (선택)" style={inputStyle}/>
      <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
      <button className="btn sm primary" onClick={onSubmit}
        disabled={busy || !form.rawMenuName.trim() || !form.category || !form.groupName.trim()}>
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}

const inputStyle = {
  padding:'6px 10px', borderRadius:6,
  border:'1px solid var(--border)', background:'var(--surface-2)',
  color:'var(--text-1)', fontSize:13,
};
