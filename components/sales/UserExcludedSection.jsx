'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { getUserExcluded, addUserExcluded, deleteUserExcluded, updateUserExcluded } from '@/lib/sales';

/**
 * UserExcludedSection — 사용자 추가 제외 메뉴 CRUD (enable 토글 미지원: schema에 없음)
 */
export function UserExcludedSection() {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ menuName: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { setList(await getUserExcluded()); } catch (err) { console.warn(err); }
  }

  async function handleAdd() {
    if (!form.menuName.trim()) return;
    setBusy(true);
    try {
      await addUserExcluded(form);
      showToast('제외 메뉴가 추가됐어요', 'ok');
      setForm({ menuName: '' }); setAdding(false);
      refresh();
    } catch (err) {
      showToast(err?.message || '추가 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleUpdate(id) {
    if (!form.menuName.trim()) return;
    setBusy(true);
    try {
      await updateUserExcluded({ id, menuName: form.menuName });
      showToast('수정됐어요', 'ok');
      setEditingId(null);
      refresh();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'err');
    } finally { setBusy(false); }
  }

  function startEdit(e) {
    setEditingId(e.id);
    setForm({ menuName: e.menuName });
  }

  async function handleDelete(id) {
    try { await deleteUserExcluded(id); showToast('삭제됐어요', 'ok'); refresh(); }
    catch { showToast('삭제 실패', 'err'); }
  }

  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <div style={{fontSize:13, fontWeight:700}}>
          사용자 추가 제외 <span style={{color:'var(--text-3)', fontWeight:500, marginLeft:6}}>{list.length}개</span>
        </div>
        <button className="btn sm" onClick={() => { setAdding(v => !v); setEditingId(null); setForm({ menuName: '' }); }}>
          {adding ? '닫기' : <><Icon.plus style={{width:12, height:12}}/> 추가</>}
        </button>
      </div>

      {adding && (
        <RowForm form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={handleAdd} busy={busy}/>
      )}

      {list.length === 0 && !adding ? (
        <div style={{padding:'16px 0', textAlign:'center', color:'var(--text-3)', fontSize:12}}>
          사용자 추가 제외 메뉴가 아직 없습니다
        </div>
      ) : list.length > 0 && (
        <table className="data-table">
          <thead><tr><th>메뉴명</th><th style={{width:130}}></th></tr></thead>
          <tbody>
            {list.map(e => editingId === e.id ? (
              <tr key={e.id}>
                <td colSpan={2} style={{padding:8}}>
                  <RowForm form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={() => handleUpdate(e.id)} busy={busy} submitLabel="저장"/>
                </td>
              </tr>
            ) : (
              <tr key={e.id}>
                <td className="cell-name"><div className="menu-name">{e.menuName}</div></td>
                <td style={{textAlign:'right'}}>
                  <button className="btn sm" onClick={() => startEdit(e)}>수정</button>
                  {' '}
                  <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => handleDelete(e.id)}>삭제</button>
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
    <div style={{display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, marginBottom:8}}>
      <input value={form.menuName} onChange={e => setForm({ ...form, menuName: e.target.value })} placeholder="제외할 메뉴명 (정규화 후)" style={inputStyle}/>
      <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
      <button className="btn sm primary" onClick={onSubmit} disabled={busy || !form.menuName.trim()}>
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
