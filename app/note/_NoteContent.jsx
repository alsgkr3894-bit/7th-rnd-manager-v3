'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { NoteCardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { sharedRestoreRecord as restoreRecord } from '@/lib/db/shared';
import { getAllNotes, addNote, deleteNote, updateNote } from '@/lib/note';
import { NOTE_STATUS } from '@/lib/note/constants';
import { getNoteDetailStats } from '@/lib/stats/note-stats';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS, setNoteFrom } from '@/lib/note/keys';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { useNoteFilter } from '@/hooks/useNoteFilter';
import { copyText } from '@/lib/ui/clipboard';
import { useNotePins } from '@/hooks/useNotePins';
import { useNotePresets } from '@/hooks/useNotePresets';
import { useNoteBatchActions } from '@/hooks/useNoteBatchActions';
import { buildHighlightRegex } from '@/lib/note/utils';
import { NoteCard } from './_NoteCard';
import { NoteContextMenu } from './_NoteContextMenu';
import { NoteDetailModal } from './_NoteDetailModal';
import { NoteFilterControls } from './_NoteFilterControls';
import { NoteStatsSummary } from './_NoteStatsSummary';
import { NoteTableRow } from './_NoteTableRow';
import { NoteBatchToolbar } from './_NoteBatchToolbar';
import { NotePresetBar } from './_NotePresetBar';

const NOTE_VIEW_KEYS = new Set(['card', 'table']);

function normalizeNoteView(value) {
  return NOTE_VIEW_KEYS.has(value) ? value : 'card';
}

async function restoreDeletedNotes(records = []) {
  const failures = [];
  for (const rec of records) {
    try {
      await restoreRecord('menu_dev_notes', rec);
    } catch (err) {
      failures.push(err);
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length}개 노트 복구 실패`);
  }
}

export function NoteContent() {
  const router = useRouter();
  const pathname = usePathname();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => normalizeNoteView(tryLS(KEYS.NOTE_VIEW, 'card')));
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailNote, setDetailNote] = useState(null);
  const [stats, setStats] = useState(null);
  const [popIds, setPopIds] = useState(new Set());
  const [singleDeleteNote, setSingleDeleteNote] = useState(null);
  const { pinnedIds, togglePin } = useNotePins();

  useScrollMemory(pathname);

  // 검색/상태필터/정렬 상태 + 파생 데이터(counts·filtered)는 useNoteFilter로 위임
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    brandFilter,
    setBrandFilter,
    counts,
    filtered,
  } = useNoteFilter(notes, pinnedIds, { pathname });

  const {
    presets,
    confirmDeletePreset,
    setConfirmDeletePreset,
    savePreset,
    applyPreset,
    deletePreset,
  } = useNotePresets({ statusFilter, search, sortBy, setStatusFilter, setSearch, setSortBy });

  const [ctxMenu, setCtxMenu] = useState(null);
  const [focusedRow, setFocusedRow] = useState(null);
  const popTimersRef = useRef(new Set());
  const searchBlurTimerRef = useRef(null);

  const load = useCallback(async () => {
    await initDB();
    const [data, s] = await Promise.all([getAllNotes(), getNoteDetailStats()]);
    setNotes(data);
    setStats(s);
  }, []);

  const {
    batchMode,
    setBatchMode,
    selected,
    setSelected,
    confirmBatch,
    setConfirmBatch,
    toggleSelect,
    exitBatch,
    handleBatchDelete,
    handleBatchStatusChange,
    confirmBatchDelete,
  } = useNoteBatchActions({ setNotes, load });

  const {
    history: searchHistory,
    isOpen: showSearchHist,
    setIsOpen: setShowSearchHist,
    add: saveSearchHistory,
    scheduleAdd: scheduleSearchHistory,
    cancelScheduled: cancelSearchHistory,
  } = useSearchHistory(KEYS.NOTE_SEARCH_HISTORY);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(
    () => () => {
      popTimersRef.current.forEach(timer => clearTimeout(timer));
      popTimersRef.current.clear();
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    },
    []
  );

  useVisibilityRefresh(load);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = e => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu]);

  const hlRe = useMemo(() => buildHighlightRegex(search.trim()), [search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  function handleSearchChange(val) {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
    scheduleSearchHistory(val);
  }

  function applySearchHistory(term) {
    handleSearchChange(term);
    setShowSearchHist(false);
  }

  function closeSearchHistorySoon() {
    if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    searchBlurTimerRef.current = setTimeout(() => {
      setShowSearchHist(false);
      searchBlurTimerRef.current = null;
    }, 150);
  }

  const handleDelete = useCallback(function handleDelete(note, e) {
    e?.stopPropagation();
    setSingleDeleteNote(note);
  }, []);

  async function execDelete(note) {
    setSingleDeleteNote(null);
    try {
      // deleteNote가 삭제된 부모+자식 원본 레코드 배열을 반환 → 전부 복원해야 자식 유실 방지
      const removed = await deleteNote(note.id);
      const removedIds = new Set((removed || []).map(rec => rec.id));
      setNotes(prev => prev.filter(n => !removedIds.has(n.id)));
      if (detailNote?.id === note.id) setDetailNote(null);
      const childCount = (removed?.length ?? 1) - 1;
      const base = note.title?.trim() ? `"${note.title}" 삭제됨` : '노트 삭제됨';
      const label = childCount > 0 ? `${base} (하위 ${childCount}개 포함)` : base;
      showToast(label, 'ok', 5000, {
        label: '실행취소',
        onClick: async () => {
          try {
            await restoreDeletedNotes(removed || []);
            await load();
            showToast('삭제를 되돌렸습니다', 'ok');
          } catch (err) {
            console.error('[NoteContent] undo delete failed', err);
            showToast('실행취소 실패: ' + err.message, 'error');
            await load();
          }
        },
      });
    } catch (err) {
      console.error('[NoteContent] deleteNote', err);
      showToast('삭제 실패', 'error');
    }
  }

  async function handleCopy(note, e) {
    e.stopPropagation();
    try {
      await initDB();
      await addNote({
        ...note,
        title: `${note.title} (복사)`,
        createdAt: undefined,
        parentId: null,
      });
      showToast('노트를 복사했어요', 'ok');
      load();
    } catch (err) {
      console.error('[NoteContent] handleCopy', err);
      showToast('복사 실패', 'error');
    }
  }

  const handleStatusChange = useCallback(async function handleStatusChange(noteId, newStatus, e) {
    e.stopPropagation();
    try {
      await updateNote(noteId, { status: newStatus });
      showToast(`상태 → ${newStatus}`, 'ok');
      setNotes(prev => prev.map(n => (n.id === noteId ? { ...n, status: newStatus } : n)));
      setPopIds(s => new Set([...s, noteId]));
      const timer = setTimeout(() => {
        setPopIds(s => {
          const n = new Set(s);
          n.delete(noteId);
          return n;
        });
        popTimersRef.current.delete(timer);
      }, 400);
      popTimersRef.current.add(timer);
      setDetailNote(n => (n?.id === noteId ? { ...n, status: newStatus } : n));
    } catch (err) {
      console.error('[NoteContent] handleStatusChange', err);
      showToast('상태 변경 실패', 'error');
    }
  }, []);

  function handleNewVersion(note, e) {
    e.stopPropagation();
    setNoteFrom(note.id);
    router.push('/note/write');
  }

  async function handleBulkCopy() {
    const targets = notes.filter(n => n.status === NOTE_STATUS.REPORTING);
    if (!targets.length) {
      showToast('보고예정 노트가 없어요', 'warn');
      return;
    }
    const text = targets
      .map(
        n => `[${n.menuName}] ${n.title}
테스트 내용: ${n.testContent || '—'}
맛 평가: ${n.tasteEval || '—'}
상무님 평가: ${n.managerEval || '—'}
다음 액션: ${n.nextAction || '—'}
보고용 요약: ${n.reportSummary || '—'}`
      )
      .join('\n\n─────────────────\n\n');
    try {
      if (!(await copyText(text))) throw new Error('CLIPBOARD_UNAVAILABLE');
      showToast(`보고예정 ${targets.length}개 복사 완료`, 'ok');
    } catch {
      showToast('복사 실패', 'warn');
    }
  }

  function changeSort(key) {
    setSortBy(key);
    setVisibleCount(PAGE_SIZE);
  } // sortBy 영속은 useNoteFilter가 담당
  function changeView(mode) {
    setViewMode(mode);
    setLS(KEYS.NOTE_VIEW, mode);
  }
  function changeBrandFilter(nextBrand) {
    setBrandFilter(nextBrand);
    setVisibleCount(PAGE_SIZE);
  }
  function changeStatusFilter(nextStatus) {
    setStatusFilter(nextStatus);
    setVisibleCount(PAGE_SIZE);
  }

  const hasActiveFilter = statusFilter !== 'all' || search.trim() || sortBy !== 'createdAt';

  return (
    <main className="main page-enter">
      <ConfirmDialog
        open={confirmBatch}
        title={`노트 ${selected.size}개를 삭제할까요?`}
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmBatchDelete}
        onCancel={() => setConfirmBatch(false)}
      />
      <ConfirmDialog
        open={confirmDeletePreset !== null}
        title="프리셋을 삭제할까요?"
        message={`"${presets[confirmDeletePreset]?.name}" 프리셋이 삭제됩니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={() => {
          deletePreset(confirmDeletePreset);
          setConfirmDeletePreset(null);
        }}
        onCancel={() => setConfirmDeletePreset(null)}
      />
      <ConfirmDialog
        open={singleDeleteNote !== null}
        title="노트를 삭제할까요?"
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={() => execDelete(singleDeleteNote)}
        onCancel={() => setSingleDeleteNote(null)}
      />
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 목록']}
        title="메뉴개발노트"
        sub={`전체 ${notes.length}개`}
        actions={
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              minWidth: 0,
              width: '100%',
              maxWidth: '100%',
              flex: '1 1 100%',
            }}
          >
            {batchMode ? (
              <NoteBatchToolbar
                selected={selected}
                onStatusChange={handleBatchStatusChange}
                onDelete={handleBatchDelete}
                onExit={exitBatch}
              />
            ) : (
              <>
                {counts[NOTE_STATUS.REPORTING] > 0 && (
                  <button
                    className="btn"
                    onClick={handleBulkCopy}
                    style={{
                      color: 'var(--color-reporting)',
                      borderColor: 'var(--color-reporting-dim, #6B3FCB40)',
                    }}
                  >
                    <Icon.doc style={{ width: 13, height: 13 }} /> 보고예정 일괄복사
                  </button>
                )}
                <button className="btn" onClick={() => setBatchMode(true)}>
                  선택
                </button>
                <button className="btn" onClick={() => router.push('/note/calendar')}>
                  달력 뷰
                </button>
                <button className="btn" onClick={() => router.push('/note/board')}>
                  칸반 보드
                </button>
                <button className="btn primary" onClick={() => router.push('/note/write')}>
                  <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
                </button>
              </>
            )}
          </div>
        }
      />

      <NoteStatsSummary stats={stats} counts={counts} />

      <NoteFilterControls
        brandFilter={brandFilter}
        statusFilter={statusFilter}
        counts={counts}
        sortBy={sortBy}
        viewMode={viewMode}
        search={search}
        searchHistory={searchHistory}
        showSearchHistory={showSearchHist}
        onBrandFilter={changeBrandFilter}
        onStatusFilter={changeStatusFilter}
        onSort={changeSort}
        onView={changeView}
        onSearchChange={handleSearchChange}
        onSearchSubmit={() => saveSearchHistory(search)}
        onSearchFocus={() => setShowSearchHist(true)}
        onSearchBlur={() => {
          cancelSearchHistory();
          closeSearchHistorySoon();
        }}
        onSearchHistoryPick={applySearchHistory}
      />

      {/* 필터 프리셋 */}
      <NotePresetBar
        presets={presets}
        hasActiveFilter={hasActiveFilter}
        onApply={applyPreset}
        onSave={savePreset}
        onDelete={idx => setConfirmDeletePreset(idx)}
      />

      {/* 스켈레톤 로딩 */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && notes.length === 0 && (
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="empty-icon-wrap empty-float">
            <Icon.note style={{ width: 32, height: 32 }} />
          </div>
          <div className="empty-title">아직 노트가 없어요</div>
          <div className="empty-sub">메뉴 테스트 결과나 아이디어를 기록해보세요.</div>
          <button
            className="btn primary"
            style={{ marginTop: 8 }}
            onClick={() => router.push('/note/write')}
          >
            <Icon.plus style={{ width: 13, height: 13 }} /> 첫 노트 작성
          </button>
        </div>
      )}
      {!loading && notes.length > 0 && filtered.length === 0 && (
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="empty-icon-wrap">
            <Icon.search style={{ width: 32, height: 32 }} />
          </div>
          <div className="empty-title">
            {search ? `"${search}" 검색 결과가 없어요` : '조건에 맞는 노트가 없어요'}
          </div>
          <div className="empty-sub">필터를 바꾸거나 다른 검색어를 입력해보세요.</div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      <NoteContextMenu
        ctxMenu={ctxMenu}
        pinnedIds={pinnedIds}
        onClose={() => setCtxMenu(null)}
        onEdit={note => router.push(`/note/${note.id}`)}
        onTogglePin={noteId => togglePin(noteId)}
        onCopy={note => handleCopy(note, { stopPropagation: () => {} })}
        onStatusChange={(noteId, status) =>
          handleStatusChange(noteId, status, { stopPropagation: () => {} })
        }
        onDelete={note => handleDelete(note)}
      />

      {/* 카드 그리드 */}
      {filtered.length > 0 && viewMode === 'card' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            {visible.map((note, i) => (
              <div
                key={note.id}
                className="stagger note-card-wrap"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                onContextMenu={e => {
                  e.preventDefault();
                  const x = Math.min(e.clientX || 0, window.innerWidth - 180);
                  const y = Math.min(e.clientY || 0, window.innerHeight - 220);
                  setCtxMenu({ x, y, note });
                }}
              >
                {note.testContent && note.testContent.length > 80 && (
                  <div className="note-hover-preview">{note.testContent}</div>
                )}
                {batchMode && (
                  <div
                    className={'batch-checkbox-wrap' + (selected.has(note.id) ? ' checked' : '')}
                    onClick={e => {
                      e.stopPropagation();
                      toggleSelect(note.id);
                    }}
                  >
                    {selected.has(note.id) && (
                      <span style={{ fontSize: 12, fontWeight: 800 }}>✓</span>
                    )}
                  </div>
                )}
                <NoteCard
                  note={note}
                  onEdit={e => {
                    e.stopPropagation();
                    router.push(`/note/${note.id}`);
                  }}
                  onDelete={e => handleDelete(note, e)}
                  onCopy={e => handleCopy(note, e)}
                  onStatusChange={(s, e) => handleStatusChange(note.id, s, e)}
                  onNewVersion={e => handleNewVersion(note, e)}
                  onClick={() => (batchMode ? toggleSelect(note.id) : setDetailNote(note))}
                  hlRe={hlRe}
                  statusPop={popIds.has(note.id)}
                  batchMode={batchMode}
                  selected={selected.has(note.id)}
                  pinned={pinnedIds.has(note.id)}
                  onPin={e => togglePin(note.id, e)}
                  onTagClick={t => {
                    setSearch(t);
                    setShowSearchHist(false);
                  }}
                />
              </div>
            ))}
          </div>
          {visible.length < filtered.length && (
            <button className="load-more-btn" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              더 보기 ({filtered.length - visible.length}개 남음)
            </button>
          )}
        </>
      )}

      {/* 테이블 뷰 */}
      {filtered.length > 0 && viewMode === 'table' && (
        <div className="card table-card" style={{ marginTop: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              className="data-table stagger-rows"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusedRow(r => {
                    const cur = r == null ? -1 : filtered.findIndex(n => n.id === r);
                    return filtered[Math.min(cur + 1, filtered.length - 1)]?.id ?? r;
                  });
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusedRow(r => {
                    const cur = r == null ? filtered.length : filtered.findIndex(n => n.id === r);
                    return filtered[Math.max(cur - 1, 0)]?.id ?? r;
                  });
                } else if (e.key === 'Enter' && focusedRow != null) {
                  const note = filtered.find(n => n.id === focusedRow);
                  if (note) setDetailNote(note);
                } else if (e.key === 'Escape') {
                  setFocusedRow(null);
                }
              }}
            >
              <thead
                style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)' }}
              >
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
                      setFocusedRow(target.id);
                      setDetailNote(target);
                    }}
                    onEdit={target => router.push(`/note/${target.id}`)}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {visible.length < filtered.length && (
            <button className="load-more-btn" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              더 보기 ({filtered.length - visible.length}개 남음)
            </button>
          )}
        </div>
      )}

      {detailNote && (
        <NoteDetailModal
          note={detailNote}
          onClose={() => setDetailNote(null)}
          onEdit={() => router.push(`/note/${detailNote.id}`)}
        />
      )}
    </main>
  );
}
