'use client';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { usePagination } from '@/hooks/usePagination';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  getUserRules,
  addUserRule,
  deleteUserRule,
  updateUserRule,
  getClassificationNameOptions,
} from '@/lib/sales';
import {
  SectionHeader,
  SectionEmpty,
  reapplyToUploadedData,
  markPendingReclassify,
} from './shared/SectionUtils';
import { useSettingsSection } from '@/hooks/useSettingsSection';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { UserRuleForm } from './user-rules/UserRuleForm';
import { UserRulesTable } from './user-rules/UserRulesTable';
import {
  filterUserRule,
  INITIAL_USER_RULE_FORM,
  isValidUserRuleForm,
  nextUserRuleSortState,
  sortUserRules,
  userRuleFormFromItem,
} from './user-rules/userRulesUtils';

export function UserRulesSection({ canEdit = false }) {
  // 마운트 후 교정 — SSR 불일치 없음, 폼 카테고리 기본값도 안전
  const isMain = useIsMainBrand();
  const [nameOpts, setNameOpts] = useState({ groupNames: [], detailNames: [] });
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
    initialForm: INITIAL_USER_RULE_FORM,
    getAll: getUserRules,
    add: f => addUserRule(f),
    update: (id, f) => updateUserRule({ id, ...f }),
    remove: deleteUserRule,
    getFormFromItem: userRuleFormFromItem,
    validateAdd: isValidUserRuleForm,
    validateUpdate: isValidUserRuleForm,
    messages: { add: '규칙이 추가됐어요' },
  });

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const opts = await getClassificationNameOptions();
        if (!ignore) setNameOpts(opts);
      } catch (err) {
        if (!ignore) console.warn('[UserRulesSection] load classification options failed', err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const ruleFilterFn = useCallback((rule, queryText) => filterUserRule(rule, queryText), []);
  const { query, setQuery, filtered } = useSectionSearch(list, ruleFilterFn);

  // 검색어 변경 시 편집 중 행 자동 취소 (필터로 사라진 행 편집 방지)
  useEffect(() => {
    if (query) cancelEdit();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const { showConfirm, confirmElement } = useConfirmDialog();

  async function handleToggle(r) {
    if (!canEdit) return;
    if (!r || r.id == null) return;

    try {
      await updateUserRule({ id: r.id, enable: r.enable !== false ? false : true });
      refresh();
      markPendingReclassify();
      const apply = await showConfirm({
        message:
          '기존 업로드 파일의 분류를 지금 다시 반영할까요?\n취소 시 규칙은 저장되며 다음 업로드부터 적용됩니다.',
      });
      if (apply) await reapplyToUploadedData();
    } catch {
      showToast('토글 실패', 'error');
    }
  }

  const sorted = useMemo(
    () => sortUserRules(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const { page, goTo, totalPages, paged, total } = usePagination(sorted, 20);

  function toggleSort(key) {
    const next = nextUserRuleSortState({ sortKey, sortDir }, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionHeader
        title="사용자 추가 규칙"
        count={list.length}
        adding={canEdit && adding}
        disabled={!canEdit}
        onAdd={resetAdding}
      />

      {canEdit && adding && (
        <UserRuleForm
          form={form}
          setForm={setForm}
          onCancel={() => setAdding(false)}
          onSubmit={handleAdd}
          busy={busy}
          nameOpts={nameOpts}
          isMain={isMain}
          canEdit={canEdit}
        />
      )}

      {list.length === 0 && !(canEdit && adding) ? (
        <SectionEmpty>사용자 추가 규칙이 아직 없습니다</SectionEmpty>
      ) : (
        list.length > 0 && (
          <UserRulesTable
            query={query}
            onQuery={setQuery}
            total={total}
            listLength={list.length}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            paged={paged}
            page={page}
            totalPages={totalPages}
            onPage={goTo}
            editingId={editingId}
            onCancelEdit={() => setEditingId(null)}
            form={form}
            setForm={setForm}
            busy={busy}
            canEdit={canEdit}
            onUpdate={handleUpdate}
            nameOpts={nameOpts}
            isMain={isMain}
            pendingDeleteId={pendingDeleteId}
            onEdit={startEdit}
            onToggle={handleToggle}
            onRequestDelete={requestDelete}
            onCancelDelete={cancelDelete}
            onConfirmDelete={confirmDelete}
          />
        )
      )}
      {confirmElement}
    </div>
  );
}
