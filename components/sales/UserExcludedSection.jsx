'use client';
import { useEffect, useMemo, useState } from 'react';
import { InlineConfirmButtons } from '@/components/ui/InlineConfirmButtons';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { getUserExcluded, addUserExcluded, deleteUserExcluded, updateUserExcluded } from '@/lib/sales';
import { inputStyle, SectionHeader, SectionEmpty } from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';

const INITIAL_FORM = { menuName: '' };
const PAGE_SIZE = 20;

export function UserExcludedSection() {
  const [query, setQuery] = useState('');

  const {
    list, adding, setAdding, editingId, setEditingId, form, setForm, busy,
    handleAdd, handleUpdate, requestDelete, cancelDelete, confirmDelete,
    pendingDeleteId, startEdit, resetAdding, cancelEdit,
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

  useEffect(() => { if (query) cancelEdit(); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(e => (e.menuName || '').toLowerCase().includes(q));
  }, [list, query]);

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, PAGE_SIZE);

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
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ flex: '1 1 260px' }}>
              <SearchBox value={query} onChange={setQuery} placeholder="메뉴명 검색" />
            </div>
            {query && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {total} / {list.length}개
              </span>
            )}
          </div>
          {filtered.length === 0 ? (
            <SectionEmpty>검색 결과가 없습니다</SectionEmpty>
          ) : (
        <table className="data-table">
          <thead><tr><th>메뉴명</th><th style={{width:130}}></th></tr></thead>
          <tbody>
            {paged.map(e => editingId === e.id ? (
              <tr key={e.id}>
                <td colSpan={2} style={{padding:8}}>
                  <RowForm form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={() => handleUpdate(e.id)} busy={busy} submitLabel="저장"/>
                </td>
              </tr>
            ) : (
              <tr key={e.id}>
                <td className="cell-name"><div className="menu-name">{e.menuName}</div></td>
                <td style={{textAlign:'right'}}>
                  {pendingDeleteId === e.id ? (
                    <InlineConfirmButtons
                      message="제외 메뉴를 삭제할까요?"
                      busy={busy}
                      onCancel={cancelDelete}
                      onConfirm={() => confirmDelete(e.id)}
                    />
                  ) : (
                    <>
                      <button className="btn sm" onClick={() => startEdit(e)}>수정</button>
                      {' '}
                      <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => requestDelete(e.id)}>삭제</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
          <Pagination page={page} totalPages={totalPages} onPage={goTo} total={total} pageSize={PAGE_SIZE} />
        </>
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
