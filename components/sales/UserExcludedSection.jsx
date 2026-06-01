'use client';
import { getUserExcluded, addUserExcluded, deleteUserExcluded, updateUserExcluded } from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty } from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';

const INITIAL_FORM = { menuName: '' };

export function UserExcludedSection() {
  const {
    list, adding, setAdding, editingId, setEditingId, form, setForm, busy,
    handleAdd, handleUpdate, handleDelete, startEdit, resetAdding,
  } = useSettingsSection({
    initialForm:     INITIAL_FORM,
    getAll:          getUserExcluded,
    add:             (f) => addUserExcluded(f),
    update:          (id, f) => updateUserExcluded({ id, menuName: f.menuName }),
    remove:          deleteUserExcluded,
    getFormFromItem: (e) => ({ menuName: e.menuName }),
    validateAdd:     (f) => !!f.menuName.trim(),
    validateUpdate:  (f) => !!f.menuName.trim(),
    messages:        { add: '제외 메뉴가 추가됐어요' },
  });

  return (
    <div style={{marginBottom:16}}>
      <SectionHeader
        title="사용자 추가 제외"
        count={list.length}
        adding={adding}
        onAdd={resetAdding}
      />

      {adding && (
        <RowForm form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={handleAdd} busy={busy}/>
      )}

      {list.length === 0 && !adding ? (
        <SectionEmpty>사용자 추가 제외 메뉴가 아직 없습니다</SectionEmpty>
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
