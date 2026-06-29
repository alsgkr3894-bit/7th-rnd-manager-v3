'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { KanbanCard } from '@/components/note/KanbanCard';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import { useCurrentRole } from '@/hooks/useCurrentRole';

export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const {
    notes,
    loading,
    loadError,
    retryLoad,
    search,
    setSearch,
    searchActive,
    filteredNotes,
    totalBoardCount,
    groupedNotes,
    dragId,
    setDragId,
    dragOverStatus,
    setDragOverStatus,
    dropTarget,
    setDropTarget,
    bouncingIds,
    handleDrop,
    moveStatus,
    changeStatus,
  } = useKanbanBoard({ canEdit });

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['메뉴개발노트', '칸반 보드']}
        title="칸반 보드"
        sub={
          search
            ? `검색 ${filteredNotes.length}개 / 전체 ${totalBoardCount}개`
            : `전체 ${totalBoardCount}개`
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn no-print" onClick={() => router.push('/note')}>
              목록 뷰
            </button>
            <button
              className="btn primary no-print"
              onClick={() => {
                if (canEdit) router.push('/note/write');
              }}
              disabled={!canEdit}
            >
              <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
            </button>
          </div>
        }
      />

      <div style={{ marginTop: 16, maxWidth: 420 }} className="no-print">
        <SearchBox value={search} onChange={setSearch} placeholder="제목·내용·태그 검색" />
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          불러오는 중…
        </div>
      )}

      {!loading && loadError && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '32px 24px',
            color: 'var(--text-2)',
            marginTop: 16,
            borderColor: 'color-mix(in oklab, var(--negative) 28%, var(--border))',
          }}
        >
          <Icon.alert
            style={{ width: 28, height: 28, marginBottom: 10, color: 'var(--negative)' }}
          />
          <div style={{ fontWeight: 700, marginBottom: 4 }}>칸반 데이터를 불러오지 못했습니다</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{loadError}</div>
          <button className="btn" onClick={retryLoad}>
            다시 시도
          </button>
        </div>
      )}

      {/* 칸반 컬럼 컨테이너 */}
      {!loadError && filteredNotes.length > 0 && (
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
            const sc = STATUS_COLORS[status] || STATUS_COLORS['테스트'];
            const sb = STATUS_BORDER[status] || 'var(--border)';
            const isOver = dragOverStatus === status;
            return (
              <div
                key={status}
                style={{ minWidth: 180 }}
                className={isOver ? 'kanban-col-over' : undefined}
                onDragOver={e => {
                  if (searchActive || !canEdit) return;
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
                        if (searchActive || !canEdit) return;
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
                        canEdit={canEdit}
                        isDragging={dragId === note.id}
                        bouncing={bouncingIds.has(note.id)}
                        draggable={canEdit && !searchActive}
                        onDragStart={e => {
                          if (searchActive || !canEdit) return;
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

      {!loading && !loadError && notes.length === 0 && (
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
            onClick={() => {
              if (canEdit) router.push('/note/write');
            }}
            disabled={!canEdit}
          >
            <Icon.plus style={{ width: 13, height: 13 }} /> 노트 작성
          </button>
        </div>
      )}
      {!loading && !loadError && notes.length > 0 && filteredNotes.length === 0 && (
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
