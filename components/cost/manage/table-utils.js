'use client';
import { useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 60;

function valueOf(row, key) {
  if (!row || !key) return '';
  if (typeof key === 'function') return key(row);
  return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), row);
}

function compareValues(a, b) {
  const av = a == null ? '' : a;
  const bv = b == null ? '' : b;
  const an = typeof av === 'number' ? av : Number(String(av).replace(/,/g, ''));
  const bn = typeof bv === 'number' ? bv : Number(String(bv).replace(/,/g, ''));
  if (Number.isFinite(an) && Number.isFinite(bn) && String(av).trim() !== '' && String(bv).trim() !== '') {
    return an - bn;
  }
  return String(av).localeCompare(String(bv), 'ko', { numeric: true, sensitivity: 'base' });
}

export function sortRows(rows, sort, options = []) {
  const opt = options.find(o => o.id === sort?.id);
  if (!opt) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => compareValues(valueOf(a, opt.key || opt.id), valueOf(b, opt.key || opt.id)) * dir);
}

export function useCostManageTable(rows, {
  pageSize = DEFAULT_PAGE_SIZE,
  sortOptions = [],
  initialSort = null,
  getRowId = row => row.id,
} = {}) {
  const [sort, setSort] = useState(initialSort || (sortOptions[0] ? { id: sortOptions[0].id, dir: 'asc' } : null));
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sorted = useMemo(() => sortRows(rows, sort, sortOptions), [rows, sort, sortOptions]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  function changeSort(id) {
    setPage(1);
    setSort(prev => prev?.id === id ? { id, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' });
  }

  function goTo(nextPage) {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  }

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    const ids = paged.map(getRowId).filter(id => id != null);
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirmingDelete(false);
  }

  return {
    sort, setSort, changeSort,
    page: currentPage, goTo, totalPages, paged, total, pageSize,
    selected, setSelected, toggle, togglePage, clearSelection,
    confirmingDelete, setConfirmingDelete,
    allPageSelected: paged.length > 0 && paged.every(row => selected.has(getRowId(row))),
  };
}

export function sortButtonOptions(options, sort) {
  return options.map(opt => ({
    id: opt.id,
    label: `${opt.label}${sort?.id === opt.id ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}`,
  }));
}

export function SortableHeader({ label, id, sort, onSort, style }) {
  const active = sort?.id === id;
  return (
    <th style={style}>
      <button
        type="button"
        onClick={() => onSort(id)}
        style={{
          border: 0,
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          color: active ? 'var(--accent)' : 'inherit',
          font: 'inherit',
          fontWeight: active ? 800 : undefined,
        }}
      >
        {label}{active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );
}

export function InlineEditCell({ value, onSave, type = 'text', align = 'left', required = false, formatter }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const display = formatter ? formatter(value) : (value ?? '');

  async function commit() {
    const next = type === 'number' ? (draft === '' ? null : Number(draft)) : String(draft).trim();
    if (required && (next == null || next === '')) return;
    if (next === value || String(next ?? '') === String(value ?? '')) {
      setEditing(false);
      return;
    }
    await onSave(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <td style={{ textAlign: align }}>
        <input
          className="form-input"
          type={type}
          value={draft ?? ''}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(value ?? '');
              setEditing(false);
            }
          }}
          style={{ height: 28, minWidth: 70, textAlign: align }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      title="클릭해서 수정"
      style={{ textAlign: align, cursor: 'text' }}
    >
      {display || <span style={{ color: 'var(--text-4)' }}>—</span>}
    </td>
  );
}

export function SelectionToolbar({ selectedCount, confirming, onAskDelete, onConfirmDelete, onCancel, noun = '항목' }) {
  if (selectedCount <= 0) return null;
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--surface-2)', fontSize: 13,
    }}>
      <b>{selectedCount}개 선택됨</b>
      {confirming ? (
        <>
          <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
            선택한 {noun}을 삭제할까요?
          </span>
          <button className="btn sm" style={{ background: 'var(--negative)', color: '#fff', border: 'none' }} onClick={onConfirmDelete}>
            삭제
          </button>
          <button className="btn sm" onClick={onCancel}>취소</button>
        </>
      ) : (
        <>
          <button className="btn sm" style={{ color: 'var(--negative)' }} onClick={onAskDelete}>
            선택 삭제
          </button>
          <button className="btn sm" onClick={onCancel}>선택 해제</button>
        </>
      )}
    </div>
  );
}
