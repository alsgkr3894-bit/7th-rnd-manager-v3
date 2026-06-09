'use client';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { InlineConfirmButtons } from '@/components/ui/InlineConfirmButtons';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { getUserAliases, addUserAlias, deleteUserAlias, updateUserAlias } from '@/lib/sales';
import {
  inputStyle,
  SectionHeader,
  SectionEmpty,
  reapplyToUploadedData,
} from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';
import { asDisplayText } from '@/lib/ui/prop-guards';

const INITIAL_FORM = { rawName: '', mappedName: '' };
const PAGE_SIZE = 20;

export function UserAliasesSection() {
  const [query, setQuery] = useState('');

  const {
    list,
    adding,
    setAdding,
    editingId,
    setEditingId,
    form,
    setForm,
    busy,
    handleAdd,
    handleUpdate,
    requestDelete,
    cancelDelete,
    confirmDelete,
    pendingDeleteId,
    startEdit,
    resetAdding,
    refresh,
    cancelEdit,
  } = useSettingsSection({
    initialForm: INITIAL_FORM,
    getAll: getUserAliases,
    add: f => addUserAlias({ rawName: f.rawName, mappedName: f.mappedName }),
    update: (id, f) => updateUserAlias({ id, rawName: f.rawName, mappedName: f.mappedName }),
    remove: deleteUserAlias,
    getFormFromItem: a => ({ rawName: a.rawName, mappedName: a.mappedName }),
    validateAdd: f => !!(f.rawName.trim() && f.mappedName.trim()),
    validateUpdate: f => !!(f.rawName.trim() && f.mappedName.trim()),
    messages: { add: '별칭이 추가됐어요' },
  });

  // 검색어 변경 시 편집 중 상태 해제 (사라진 행에서 편집 중 방지)
  useEffect(() => {
    if (query) cancelEdit();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      a =>
        asDisplayText(a.rawName).toLowerCase().includes(q) ||
        asDisplayText(a.mappedName).toLowerCase().includes(q)
    );
  }, [list, query]);

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, PAGE_SIZE);

  async function handleToggle(a) {
    if (!a || a.id == null) return;

    try {
      await updateUserAlias({ id: a.id, enable: a.enable !== false ? false : true });
      refresh();
      await reapplyToUploadedData();
    } catch {
      showToast('토글 실패', 'err');
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionHeader
        title="사용자 추가 별칭"
        count={list.length}
        adding={adding}
        onAdd={resetAdding}
      />

      {adding && (
        <RowForm
          form={form}
          setForm={setForm}
          onCancel={() => setAdding(false)}
          onSubmit={handleAdd}
          busy={busy}
        />
      )}

      {list.length === 0 && !adding ? (
        <SectionEmpty>사용자 추가 별칭이 아직 없습니다</SectionEmpty>
      ) : (
        list.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: '1 1 260px' }}>
                <SearchBox value={query} onChange={setQuery} placeholder="입력·출력 검색" />
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
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>입력</th>
                      <th>출력 (표준)</th>
                      <th style={{ width: 80, textAlign: 'center' }}>활성</th>
                      <th style={{ width: 140 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((a, index) => {
                      const aliasId = a.id;
                      const hasAliasId = aliasId != null;
                      const key = asDisplayText(aliasId, `alias-${index}`);
                      const rawName = asDisplayText(a.rawName, '-');
                      const mappedName = asDisplayText(a.mappedName, '-');

                      return editingId === aliasId && hasAliasId ? (
                        <tr key={key}>
                          <td colSpan={4} style={{ padding: 8 }}>
                            <RowForm
                              form={form}
                              setForm={setForm}
                              onCancel={() => setEditingId(null)}
                              onSubmit={() => handleUpdate(aliasId)}
                              busy={busy}
                              submitLabel="저장"
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={key} style={{ opacity: a.enable === false ? 0.5 : 1 }}>
                          <td className="cell-name">
                            <div className="menu-name">{rawName}</div>
                          </td>
                          <td>
                            <b>{mappedName}</b>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Toggle
                              value={a.enable !== false}
                              onChange={() => handleToggle(a)}
                              disabled={!hasAliasId}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {pendingDeleteId === aliasId && hasAliasId ? (
                              <InlineConfirmButtons
                                message="별칭을 삭제할까요?"
                                busy={busy}
                                onCancel={cancelDelete}
                                onConfirm={() => confirmDelete(aliasId)}
                              />
                            ) : hasAliasId ? (
                              <>
                                <button className="btn sm" onClick={() => startEdit(a)}>
                                  수정
                                </button>{' '}
                                <button
                                  className="btn sm"
                                  style={{ color: 'var(--negative)' }}
                                  onClick={() => requestDelete(aliasId)}
                                >
                                  삭제
                                </button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </>
        )
      )}
    </div>
  );
}

function RowForm({ form, setForm, onCancel, onSubmit, busy, submitLabel = '추가' }) {
  const safeForm = form && typeof form === 'object' ? form : INITIAL_FORM;
  const rawName = asDisplayText(safeForm.rawName);
  const mappedName = asDisplayText(safeForm.mappedName);
  const updateForm = typeof setForm === 'function' ? setForm : () => {};
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;
  const handleSubmit = typeof onSubmit === 'function' ? onSubmit : undefined;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto auto',
        gap: 8,
      }}
    >
      <input
        value={rawName}
        onChange={e => updateForm({ ...safeForm, rawName: e.target.value })}
        placeholder="입력 (정규화 후)"
        style={inputStyle}
      />
      <input
        value={mappedName}
        onChange={e => updateForm({ ...safeForm, mappedName: e.target.value })}
        placeholder="표준 메뉴명"
        style={inputStyle}
      />
      <button className="btn sm" onClick={handleCancel} disabled={busy}>
        취소
      </button>
      <button
        className="btn sm primary"
        onClick={handleSubmit}
        disabled={busy || !rawName.trim() || !mappedName.trim()}
      >
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}
