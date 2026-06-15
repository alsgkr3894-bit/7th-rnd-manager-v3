'use client';
import { NoteTableRow } from './_NoteTableRow';

export function NoteTableView({
  visible,
  filtered,
  focusedRow,
  onFocusRow,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  onLoadMore,
}) {
  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFocusRow(rowId => {
        const current = rowId == null ? -1 : filtered.findIndex(note => note.id === rowId);
        return filtered[Math.min(current + 1, filtered.length - 1)]?.id ?? rowId;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFocusRow(rowId => {
        const current =
          rowId == null ? filtered.length : filtered.findIndex(note => note.id === rowId);
        return filtered[Math.max(current - 1, 0)]?.id ?? rowId;
      });
    } else if (e.key === 'Enter' && focusedRow != null) {
      const note = filtered.find(item => item.id === focusedRow);
      if (note) onOpen(note);
    } else if (e.key === 'Escape') {
      onFocusRow(null);
    }
  }

  return (
    <div className="card table-card" style={{ marginTop: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table stagger-rows" tabIndex={0} onKeyDown={handleKeyDown}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)' }}>
            <tr>
              <th scope="col">제목</th>
              <th scope="col" style={{ width: 100 }}>
                메뉴명
              </th>
              <th scope="col" style={{ width: 80 }}>
                카테고리
              </th>
              <th scope="col" style={{ width: 90 }}>
                상태
              </th>
              <th scope="col" style={{ width: 90 }}>
                날짜
              </th>
              <th scope="col" style={{ width: 80 }} aria-label="액션" />
            </tr>
          </thead>
          <tbody>
            {visible.map(note => (
              <NoteTableRow
                key={note.id}
                note={note}
                focused={focusedRow === note.id}
                onOpen={target => {
                  onFocusRow(target.id);
                  onOpen(target);
                }}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </tbody>
        </table>
      </div>
      {visible.length < filtered.length && (
        <button className="load-more-btn" onClick={onLoadMore}>
          더 보기 ({filtered.length - visible.length}개 남음)
        </button>
      )}
    </div>
  );
}
