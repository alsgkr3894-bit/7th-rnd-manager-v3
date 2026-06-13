'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  STATUSES,
  STATUS_COLORS,
  STATUS_BORDER,
  getAllNotes,
  updateNote,
  bulkUpdateBoardOrder,
} from '@/lib/note';
import { KanbanCard } from '@/components/note/KanbanCard';

export default function Page() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { status, beforeIdx }
  const [bouncingIds, setBouncingIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const bounceTimersRef = useRef(new Set());
  const searchActive = search.trim().length > 0;

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(
    () => () => {
      bounceTimersRef.current.forEach(timer => clearTimeout(timer));
      bounceTimersRef.current.clear();
    },
    []
  );

  useVisibilityRefresh(load);

  const applyStatusChange = useCallback(
    async (note, newStatus, { bounce = true } = {}) => {
      // Optimistic update — instant visual feedback
      setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, status: newStatus } : n)));
      try {
        await updateNote(note.id, { status: newStatus });
        showToast(`→ ${newStatus}`, 'ok');
        await load();
        if (bounce) {
          setBouncingIds(s => new Set([...s, note.id]));
          const timer = setTimeout(() => {
            setBouncingIds(s => {
              const n = new Set(s);
              n.delete(note.id);
              return n;
            });
            bounceTimersRef.current.delete(timer);
          }, 400);
          bounceTimersRef.current.add(timer);
        }
      } catch {
        showToast('상태 변경 실패', 'error');
        await load(); // 낙관적 업데이트 실패 시 롤백
      }
    },
    [load]
  );

  const moveStatus = useCallback(
    (note, direction) => {
      const newIdx = STATUSES.indexOf(note.status) + direction;
      if (newIdx < 0 || newIdx >= STATUSES.length) return;
      return applyStatusChange(note, STATUSES[newIdx]);
    },
    [applyStatusChange]
  );

  const changeStatus = useCallback(
    (note, newStatus) => {
      if (note.status === newStatus) return;
      return applyStatusChange(note, newStatus);
    },
    [applyStatusChange]
  );

  async function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);
    if (searchActive) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) {
      setDropTarget(null);
      return;
    }
    const note = notes.find(n => String(n.id) === String(noteId));
    if (!note) {
      setDropTarget(null);
      return;
    }

    const colNotes = groupedNotes.find(g => g.status === status)?.notes ?? [];
    const beforeIdx =
      dropTarget?.status === status ? (dropTarget.beforeIdx ?? colNotes.length) : colNotes.length;
    setDropTarget(null);

    if (note.status === status) {
      // 같은 컬럼 내 순서 변경 — boardOrder를 단일 트랜잭션으로 일괄 저장
      const without = colNotes.filter(n => n.id !== note.id);
      const origIdx = colNotes.findIndex(n => n.id === note.id);
      const insertAt = origIdx < beforeIdx ? beforeIdx - 1 : beforeIdx;
      without.splice(Math.max(0, Math.min(insertAt, without.length)), 0, note);
      await bulkUpdateBoardOrder(without.map((n, i) => ({ id: n.id, boardOrder: i * 10 })));
      await load();
    } else {
      // 다른 컬럼으로 이동 — 상태 변경(updateNote) + 나머지 순서 일괄 갱신
      const newCol = [...colNotes];
      newCol.splice(Math.min(beforeIdx, newCol.length), 0, note);
      const targetOrder = Math.min(beforeIdx, newCol.length - 1) * 10;
      await updateNote(note.id, { status, boardOrder: targetOrder });
      const siblingUpdates = newCol
        .filter(n => n.id !== note.id)
        .map((n, i) => ({
          id: n.id,
          boardOrder: (i >= Math.min(beforeIdx, newCol.length - 1) ? i + 1 : i) * 10,
        }));
      await bulkUpdateBoardOrder(siblingUpdates);
      showToast(`→ ${status}`, 'ok');
      await load();
      setBouncingIds(s => new Set([...s, note.id]));
      const timer = setTimeout(() => {
        setBouncingIds(s => {
          const n = new Set(s);
          n.delete(note.id);
          return n;
        });
        bounceTimersRef.current.delete(timer);
      }, 400);
      bounceTimersRef.current.add(timer);
    }
    setDragId(null);
  }

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.menuName || '').toLowerCase().includes(q) ||
        (n.testContent || '').toLowerCase().includes(q) ||
        (n.reportSummary || '').toLowerCase().includes(q) ||
        (n.tags || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  // boardOrder 오름차순 정렬 — 없으면(구 데이터) createdAt 역순 유지
  const groupedNotes = useMemo(
    () =>
      STATUSES.map(st => ({
        status: st,
        notes: filteredNotes
          .filter(n => n.status === st)
          .sort((a, b) =>
            a.boardOrder != null && b.boardOrder != null
              ? a.boardOrder - b.boardOrder
              : a.boardOrder != null
                ? -1
                : b.boardOrder != null
                  ? 1
                  : 0
          ),
      })),
    [filteredNotes]
  );

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['메뉴개발노트', '칸반 보드']}
        title="칸반 보드"
        sub={
          search
            ? `검색 ${filteredNotes.length}개 / 전체 ${notes.length}개`
            : `전체 ${notes.length}개`
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn no-print" onClick={() => router.push('/note')}>
              목록 뷰
            </button>
            <button className="btn primary no-print" onClick={() => router.push('/note/write')}>
              <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
            </button>
          </div>
        }
      />

      <div style={{ marginTop: 16, maxWidth: 420 }} className="no-print">
        <SearchBox value={search} onChange={setSearch} placeholder="제목·메뉴명·내용·태그 검색" />
      </div>

      {/* 칸반 컬럼 컨테이너 */}
      {filteredNotes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STATUSES.length}, minmax(200px, 1fr))`,
            gap: 12,
            marginTop: 20,
            overflowX: 'auto',
            paddingBottom: 16,
          }}
        >
          {groupedNotes.map(({ status, notes: colNotes }, colIdx) => {
            const sc = STATUS_COLORS[status] || STATUS_COLORS['아이디어'];
            const sb = STATUS_BORDER[status] || 'var(--border)';
            const isOver = dragOverStatus === status;
            return (
              <div
                key={status}
                style={{ minWidth: 180 }}
                className={isOver ? 'kanban-col-over' : undefined}
                onDragOver={e => {
                  if (searchActive) return;
                  e.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverStatus(null);
                    setDropTarget(null);
                  }
                }}
                onDrop={e => handleDrop(e, status)}
              >
                {/* 컬럼 헤더 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: isOver ? sc.bg + 'cc' : sc.bg,
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: sb,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{status}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 700,
                      background: sb + '22',
                      color: sc.color,
                      padding: '1px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {colNotes.length}
                  </span>
                </div>

                {/* 노트 카드들 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colNotes.length === 0 && (
                    <div
                      style={{
                        borderRadius: 10,
                        border: '2px dashed var(--border)',
                        padding: '16px 12px',
                        textAlign: 'center',
                        color: 'var(--text-4)',
                        fontSize: 12,
                      }}
                    >
                      없음
                    </div>
                  )}
                  {colNotes.map((note, cardIdx) => (
                    <div
                      key={note.id}
                      onDragOver={e => {
                        if (searchActive) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        const beforeIdx = e.clientY < midY ? cardIdx : cardIdx + 1;
                        setDropTarget({ status, beforeIdx });
                      }}
                    >
                      {dropTarget?.status === status && dropTarget?.beforeIdx === cardIdx && (
                        <div className="kanban-drop-indicator" />
                      )}
                      <KanbanCard
                        note={note}
                        colIdx={colIdx}
                        maxIdx={STATUSES.length - 1}
                        onMove={moveStatus}
                        onStatusChange={changeStatus}
                        onEdit={router.push}
                        isDragging={dragId === note.id}
                        bouncing={bouncingIds.has(note.id)}
                        draggable={!searchActive}
                        onDragStart={e => {
                          if (searchActive) return;
                          e.dataTransfer.setData('noteId', note.id);
                          setDragId(note.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverStatus(null);
                          setDropTarget(null);
                        }}
                      />
                      {dropTarget?.status === status &&
                        dropTarget?.beforeIdx === cardIdx + 1 &&
                        cardIdx === colNotes.length - 1 && (
                          <div className="kanban-drop-indicator" />
                        )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            color: 'var(--text-3)',
            marginTop: 8,
          }}
        >
          <Icon.note style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.35 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>아직 노트가 없어요</div>
          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={() => router.push('/note/write')}
          >
            <Icon.plus style={{ width: 13, height: 13 }} /> 노트 작성
          </button>
        </div>
      )}
      {!loading && notes.length > 0 && filteredNotes.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 24px',
            color: 'var(--text-3)',
            marginTop: 8,
          }}
        >
          <Icon.search style={{ width: 28, height: 28, marginBottom: 10, opacity: 0.35 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>검색 결과가 없어요</div>
          <div style={{ fontSize: 12 }}>다른 키워드로 검색해보세요.</div>
        </div>
      )}
    </main>
  );
}

