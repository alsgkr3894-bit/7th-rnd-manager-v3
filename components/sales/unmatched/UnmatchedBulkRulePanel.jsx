'use client';
import { ComboBox } from '@/components/ui/ComboBox';
import { CATEGORY_ORDER } from '@/lib/sales';

export function UnmatchedBulkRulePanel({
  category,
  groupName,
  detailName,
  categoryOptions,
  busy,
  selectedCount,
  onCategoryChange,
  onGroupChange,
  onDetailChange,
  onCancel,
  onApply,
}) {
  const catOpts = categoryOptions || { groupNames: [], detailNames: [] };

  return (
    <div
      style={{
        padding: '12px 16px',
        border: '1px solid var(--accent-soft)',
        borderTop: '1px solid var(--divider)',
        borderRadius: '0 0 8px 8px',
        background: 'var(--surface-1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>카테고리</span>
        <select
          className="form-input"
          style={{ fontSize: 12 }}
          value={category}
          onChange={event => onCategoryChange(event.target.value)}
        >
          {CATEGORY_ORDER.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>그룹명</span>
        <ComboBox
          value={groupName}
          onChange={onGroupChange}
          options={catOpts.groupNames || []}
          placeholder="그룹명"
          inputClassName="form-input"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>상세명</span>
        <ComboBox
          value={detailName}
          onChange={onDetailChange}
          options={catOpts.detailNames || []}
          placeholder="상세명"
          inputClassName="form-input"
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn sm" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button className="btn sm primary" onClick={onApply} disabled={busy || !category}>
          {busy ? '적용 중...' : `${selectedCount}건 분류 적용`}
        </button>
      </div>
    </div>
  );
}
