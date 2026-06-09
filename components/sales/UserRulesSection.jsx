'use client';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { ComboBox } from '@/components/ui/ComboBox';
import { InlineConfirmButtons } from '@/components/ui/InlineConfirmButtons';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { usePagination } from '@/hooks/usePagination';
import {
  getUserRules,
  addUserRule,
  deleteUserRule,
  updateUserRule,
  getClassificationNameOptions,
  CATEGORY_INPUT_OPTIONS as CATEGORY_OPTIONS,
} from '@/lib/sales';
import {
  inputStyle,
  SectionHeader,
  SectionEmpty,
  reapplyToUploadedData,
} from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { asDisplayText } from '@/lib/ui/prop-guards';

const INITIAL_FORM = { rawMenuName: '', category: '', groupName: '', detailName: '' };

export function UserRulesSection() {
  // 마운트 후 교정 — SSR 불일치 없음, 폼 카테고리 기본값도 안전
  const isMain = useIsMainBrand();
  const [nameOpts, setNameOpts] = useState({ groupNames: [], detailNames: [] });
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

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
    getAll: getUserRules,
    add: f => addUserRule(f),
    update: (id, f) => updateUserRule({ id, ...f }),
    remove: deleteUserRule,
    getFormFromItem: r => ({
      rawMenuName: asDisplayText(r.rawMenuName || r.pattern),
      category: asDisplayText(r.category),
      groupName: asDisplayText(r.groupName),
      detailName: asDisplayText(r.detailName),
    }),
    validateAdd: f => !!(f.rawMenuName.trim() && f.category && f.groupName.trim()),
    validateUpdate: f => !!(f.rawMenuName.trim() && f.category && f.groupName.trim()),
    messages: { add: '규칙이 추가됐어요' },
  });

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const opts = await getClassificationNameOptions();
        if (!ignore) setNameOpts(opts);
      } catch (err) {
        if (!ignore) console.warn(err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // 검색어 변경 시 편집 중 행 자동 취소 (필터로 사라진 행 편집 방지)
  useEffect(() => {
    if (query) cancelEdit();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(r) {
    if (!r || r.id == null) return;

    try {
      await updateUserRule({ id: r.id, enable: r.enable !== false ? false : true });
      refresh();
      await reapplyToUploadedData();
    } catch {
      showToast('토글 실패', 'err');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      r =>
        asDisplayText(r.rawMenuName || r.pattern)
          .toLowerCase()
          .includes(q) ||
        asDisplayText(r.category).toLowerCase().includes(q) ||
        asDisplayText(r.groupName).toLowerCase().includes(q) ||
        asDisplayText(r.detailName).toLowerCase().includes(q)
    );
  }, [list, query]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = valueForSort(a, sortKey);
      const vb = valueForSort(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const { page, goTo, totalPages, paged, total } = usePagination(sorted, 20);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionHeader
        title="사용자 추가 규칙"
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
          nameOpts={nameOpts}
          isMain={isMain}
        />
      )}

      {list.length === 0 && !adding ? (
        <SectionEmpty>사용자 추가 규칙이 아직 없습니다</SectionEmpty>
      ) : (
        list.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: '1 1 260px' }}>
                <SearchBox
                  value={query}
                  onChange={setQuery}
                  placeholder="패턴·카테고리·중분류·상세 검색"
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {total} / {list.length}개
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh sortKey="pattern" active={sortKey} dir={sortDir} onClick={toggleSort}>
                    패턴
                  </SortableTh>
                  <SortableTh
                    sortKey="category"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={120}
                  >
                    카테고리
                  </SortableTh>
                  <SortableTh
                    sortKey="groupName"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={140}
                  >
                    중분류
                  </SortableTh>
                  <SortableTh
                    sortKey="detailName"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={140}
                  >
                    상세
                  </SortableTh>
                  <th style={{ width: 80, textAlign: 'center' }}>활성</th>
                  <th style={{ width: 130 }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, index) => {
                  const ruleId = r.id;
                  const hasRuleId = ruleId != null;
                  const key = asDisplayText(ruleId, `user-rule-${index}`);
                  const pattern = asDisplayText(r.rawMenuName || r.pattern, '-');
                  const category = asDisplayText(r.category, '-');
                  const groupName = asDisplayText(r.groupName, '-');
                  const detailName = asDisplayText(r.detailName, '-');

                  return editingId === ruleId && hasRuleId ? (
                    <tr key={key}>
                      <td colSpan={6} style={{ padding: 8 }}>
                        <RowForm
                          form={form}
                          setForm={setForm}
                          onCancel={() => setEditingId(null)}
                          onSubmit={() => handleUpdate(ruleId)}
                          busy={busy}
                          submitLabel="저장"
                          nameOpts={nameOpts}
                          isMain={isMain}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={key} style={{ opacity: r.enable === false ? 0.5 : 1 }}>
                      <td className="cell-name">
                        <div className="menu-name">{pattern}</div>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                        >
                          {category}
                        </span>
                      </td>
                      <td>{groupName}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{detailName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <Toggle
                          value={r.enable !== false}
                          onChange={() => handleToggle(r)}
                          disabled={!hasRuleId}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {pendingDeleteId === ruleId && hasRuleId ? (
                          <InlineConfirmButtons
                            message="규칙을 삭제할까요?"
                            busy={busy}
                            onCancel={cancelDelete}
                            onConfirm={() => confirmDelete(ruleId)}
                          />
                        ) : hasRuleId ? (
                          <>
                            <button className="btn sm" onClick={() => startEdit(r)}>
                              수정
                            </button>{' '}
                            <button
                              className="btn sm"
                              style={{ color: 'var(--negative)' }}
                              onClick={() => requestDelete(ruleId)}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={20}
            />
          </div>
        )
      )}
    </div>
  );
}

function valueForSort(row, key) {
  if (key === 'pattern') return asDisplayText(row.rawMenuName || row.pattern);
  if (key === 'createdAt') return asDisplayText(row.createdAt || row.updatedAt);
  return asDisplayText(row[key]);
}

function RowForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  busy,
  submitLabel = '추가',
  nameOpts = { groupNames: [], detailNames: [], byCategory: {} },
  isMain = true,
}) {
  const safeForm = form && typeof form === 'object' ? form : INITIAL_FORM;
  const safeNameOpts =
    nameOpts && typeof nameOpts === 'object'
      ? nameOpts
      : { groupNames: [], detailNames: [], byCategory: {} };
  const updateForm = typeof setForm === 'function' ? setForm : () => {};
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;
  const handleSubmit = typeof onSubmit === 'function' ? onSubmit : undefined;
  const rawMenuName = asDisplayText(safeForm.rawMenuName);
  const category = asDisplayText(safeForm.category);
  const groupName = asDisplayText(safeForm.groupName);
  const detailName = asDisplayText(safeForm.detailName);

  // main 브랜드에서 category가 비어있으면(초기 상태) 첫 옵션으로 자동 초기화
  // — select는 첫 항목을 시각적으로 보여주지만 form.category=''라 추가 버튼이 비활성화되는 UX 불일치 해소
  useEffect(() => {
    if (isMain && !category && CATEGORY_OPTIONS.length > 0) {
      updateForm(f => ({
        ...(f && typeof f === 'object' ? f : INITIAL_FORM),
        category: CATEGORY_OPTIONS[0],
      }));
    }
  }, [isMain]); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택한 대분류(category)에 속한 중분류·상세만 자동완성 후보로
  const catOpts = safeNameOpts.byCategory?.[category] || { groupNames: [], detailNames: [] };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0,1.5fr) minmax(80px,140px) minmax(0,1fr) minmax(0,1fr) auto auto',
        gap: 8,
      }}
    >
      <input
        value={rawMenuName}
        onChange={e => updateForm({ ...safeForm, rawMenuName: e.target.value })}
        placeholder="패턴 (정규화 후)"
        style={inputStyle}
      />
      {isMain ? (
        <select
          value={category}
          onChange={e => updateForm({ ...safeForm, category: e.target.value })}
          style={inputStyle}
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={category}
          onChange={e => updateForm({ ...safeForm, category: e.target.value })}
          placeholder="카테고리"
          style={inputStyle}
        />
      )}
      <ComboBox
        value={groupName}
        onChange={v => updateForm({ ...safeForm, groupName: v })}
        options={catOpts.groupNames}
        placeholder="중분류"
        inputStyle={inputStyle}
      />
      <ComboBox
        value={detailName}
        onChange={v => updateForm({ ...safeForm, detailName: v })}
        options={catOpts.detailNames}
        placeholder="상세 (선택)"
        inputStyle={inputStyle}
      />
      <button className="btn sm" onClick={handleCancel} disabled={busy}>
        취소
      </button>
      <button
        className="btn sm primary"
        onClick={handleSubmit}
        disabled={busy || !rawMenuName.trim() || !category || !groupName.trim()}
      >
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}
