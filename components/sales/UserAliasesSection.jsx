'use client';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { getUserAliases, addUserAlias, deleteUserAlias, updateUserAlias } from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty, reapplyToUploadedData } from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';

const INITIAL_FORM = { rawName: '', mappedName: '' };

export function UserAliasesSection() {
  const {
    list, adding, setAdding, editingId, setEditingId, form, setForm, busy,
    handleAdd, handleUpdate, handleDelete, startEdit, resetAdding,
  } = useSettingsSection({
    initialForm:     INITIAL_FORM,
    getAll:          getUserAliases,
    add:             (f) => addUserAlias({ rawName: f.rawName, mappedName: f.mappedName }),
    update:          (id, f) => updateUserAlias({ id, rawName: f.rawName, mappedName: f.mappedName }),
    remove:          deleteUserAlias,
    getFormFromItem: (a) => ({ rawName: a.rawName, mappedName: a.mappedName }),
    validateAdd:     (f) => !!(f.rawName.trim() && f.mappedName.trim()),
    validateUpdate:  (f) => !!(f.rawName.trim() && f.mappedName.trim()),
    messages:        { add: '별칭이 추가됐어요' },
  });

  async function handleToggle(a) {
    try {
      await updateUserAlias({ id: a.id, enable: a.enable !== false ? false : true });
      await reapplyToUploadedData();
    } catch { showToast('토글 실패', 'err'); }
  }

  return (
    <div style={{marginBottom:16}}>
      <SectionHeader
        title="사용자 추가 별칭"
        count={list.length}
        adding={adding}
        onAdd={resetAdding}
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
