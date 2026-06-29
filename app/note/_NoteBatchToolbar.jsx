'use client';
import { STATUSES } from '@/lib/note';

/**
 * Batch-mode toolbar rendered inside PageHeader actions.
 * Props:
 *   selected   — Set of selected note IDs
 *   onStatusChange(newStatus) — called when status dropdown changes
 *   onMerge()  — called when selected notes should be merged into one round chain
 *   onDelete() — called when "선택 삭제" is clicked
 *   onExit()   — called when "취소" is clicked
 */
export function NoteBatchToolbar({ selected, onStatusChange, onMerge, onDelete, onExit }) {
  return (
    <>
      <select
        className="batch-status-select"
        defaultValue=""
        onChange={e => {
          if (e.target.value) onStatusChange(e.target.value);
        }}
        disabled={selected.size === 0}
      >
        <option value="" disabled>
          상태 변경
        </option>
        {STATUSES.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button className="btn" onClick={onMerge} disabled={selected.size < 2}>
        차수로 묶기 {selected.size > 1 && `(${selected.size})`}
      </button>
      <button
        className="btn"
        style={{ color: 'var(--negative)' }}
        onClick={onDelete}
        disabled={selected.size === 0}
      >
        선택 삭제 {selected.size > 0 && `(${selected.size})`}
      </button>
      <button className="btn" onClick={onExit}>
        취소
      </button>
    </>
  );
}
