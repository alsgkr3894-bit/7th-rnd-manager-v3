'use client';

import { InlineConfirmButtons } from '@/components/ui/InlineConfirmButtons';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { Toggle } from '@/components/ui/Toggle';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { UserRuleForm } from './UserRuleForm';

function UserRuleTableRow({
  rule,
  index,
  editingId,
  form,
  setForm,
  busy,
  nameOpts,
  isMain,
  pendingDeleteId,
  onEdit,
  onCancelEdit,
  onUpdate,
  onToggle,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  const ruleId = rule.id;
  const hasRuleId = ruleId != null;
  const key = asDisplayText(ruleId, `user-rule-${index}`);
  const pattern = asDisplayText(rule.rawMenuName || rule.pattern, '-');
  const category = asDisplayText(rule.category, '-');
  const groupName = asDisplayText(rule.groupName, '-');
  const detailName = asDisplayText(rule.detailName, '-');

  if (editingId === ruleId && hasRuleId) {
    return (
      <tr key={key}>
        <td colSpan={6} style={{ padding: 8 }}>
          <UserRuleForm
            form={form}
            setForm={setForm}
            onCancel={onCancelEdit}
            onSubmit={() => onUpdate(ruleId)}
            busy={busy}
            submitLabel="저장"
            nameOpts={nameOpts}
            isMain={isMain}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr key={key} style={{ opacity: rule.enable === false ? 0.5 : 1 }}>
      <td className="cell-name">
        <div className="menu-name">{pattern}</div>
      </td>
      <td>
        <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {category}
        </span>
      </td>
      <td>{groupName}</td>
      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{detailName}</td>
      <td style={{ textAlign: 'center' }}>
        <Toggle value={rule.enable !== false} onChange={() => onToggle(rule)} disabled={!hasRuleId} />
      </td>
      <td style={{ textAlign: 'right' }}>
        {pendingDeleteId === ruleId && hasRuleId ? (
          <InlineConfirmButtons
            message="규칙을 삭제할까요?"
            busy={busy}
            onCancel={onCancelDelete}
            onConfirm={() => onConfirmDelete(ruleId)}
          />
        ) : hasRuleId ? (
          <>
            <button type="button" className="btn sm" onClick={() => onEdit(rule)}>
              수정
            </button>{' '}
            <button
              type="button"
              className="btn sm"
              style={{ color: 'var(--negative)' }}
              onClick={() => onRequestDelete(ruleId)}
            >
              삭제
            </button>
          </>
        ) : null}
      </td>
    </tr>
  );
}

export function UserRulesTable({
  query,
  onQuery,
  total,
  listLength,
  sortKey,
  sortDir,
  onSort,
  paged,
  page,
  totalPages,
  onPage,
  editingId,
  onCancelEdit,
  form,
  setForm,
  busy,
  onUpdate,
  nameOpts,
  isMain,
  pendingDeleteId,
  onEdit,
  onToggle,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ flex: '1 1 260px' }}>
          <SearchBox value={query} onChange={onQuery} placeholder="패턴·카테고리·중분류·상세 검색" />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {total} / {listLength}개
        </span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh sortKey="pattern" active={sortKey} dir={sortDir} onClick={onSort}>
              패턴
            </SortableTh>
            <SortableTh
              sortKey="category"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={120}
            >
              카테고리
            </SortableTh>
            <SortableTh
              sortKey="groupName"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={140}
            >
              중분류
            </SortableTh>
            <SortableTh
              sortKey="detailName"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={140}
            >
              상세
            </SortableTh>
            <th style={{ width: 80, textAlign: 'center' }}>활성</th>
            <th style={{ width: 130 }}></th>
          </tr>
        </thead>
        <tbody>
          {paged.map((rule, index) => (
            <UserRuleTableRow
              key={asDisplayText(rule.id, `user-rule-${index}`)}
              rule={rule}
              index={index}
              editingId={editingId}
              form={form}
              setForm={setForm}
              busy={busy}
              nameOpts={nameOpts}
              isMain={isMain}
              pendingDeleteId={pendingDeleteId}
              onEdit={onEdit}
              onCancelEdit={onCancelEdit}
              onUpdate={onUpdate}
              onToggle={onToggle}
              onRequestDelete={onRequestDelete}
              onCancelDelete={onCancelDelete}
              onConfirmDelete={onConfirmDelete}
            />
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} total={total} pageSize={20} />
    </div>
  );
}
