'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllNotes } from '@/lib/note';
import { NOTE_STATUS } from '@/lib/note/constants';
import { getNoteDetailStats } from '@/lib/stats/note-stats';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { useNoteFilter } from '@/hooks/useNoteFilter';
import { copyText } from '@/lib/ui/clipboard';
import { useNotePins } from '@/hooks/useNotePins';
import { useNotePresets } from '@/hooks/useNotePresets';
import { useNoteBatchActions } from '@/hooks/useNoteBatchActions';
import { useNoteItemActions } from '@/hooks/useNoteItemActions';
import { buildHighlightRegex } from '@/lib/note/utils';
import { NoteCardGrid } from './_NoteCardGrid';
import { NoteContextMenu } from './_NoteContextMenu';
import { NoteDetailModal } from './_NoteDetailModal';
import { NoteFilterControls } from './_NoteFilterControls';
import { NoteStatsSummary } from './_NoteStatsSummary';
import { NoteTableView } from './_NoteTableView';
import { NotePresetBar } from './_NotePresetBar';
import { NoteListHeader } from './_NoteListHeader';
import { NoteListStates } from './_NoteListStates';
import { NotePageDialogs } from './_NotePageDialogs';

const NOTE_VIEW_KEYS = new Set(['card', 'table']);

function normalizeNoteView(value) {
  return NOTE_VIEW_KEYS.has(value) ? value : 'card';
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

  const {
    popIds,
    singleDeleteNote,
    setSingleDeleteNote,
    handleDelete,
    execDelete,
    handleCopy,
    handleStatusChange,
    handleNewVersion,
  } = useNoteItemActions({ router, setNotes, load, detailNote, setDetailNote });

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(
    () => () => {
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
      <NotePageDialogs
        confirmBatch={confirmBatch}
        selectedCount={selected.size}
        onConfirmBatchDelete={confirmBatchDelete}
        onCancelBatchDelete={() => setConfirmBatch(false)}
        confirmDeletePreset={confirmDeletePreset}
        presetName={presets[confirmDeletePreset]?.name}
        onConfirmPresetDelete={() => {
          deletePreset(confirmDeletePreset);
          setConfirmDeletePreset(null);
        }}
        onCancelPresetDelete={() => setConfirmDeletePreset(null)}
        singleDeleteOpen={singleDeleteNote !== null}
        onConfirmSingleDelete={() => execDelete(singleDeleteNote)}
        onCancelSingleDelete={() => setSingleDeleteNote(null)}
      />
      <NoteListHeader
        notesCount={notes.length}
        batchMode={batchMode}
        selected={selected}
        reportingCount={counts[NOTE_STATUS.REPORTING]}
        onBulkCopy={handleBulkCopy}
        onEnterBatchMode={() => setBatchMode(true)}
        onCalendar={() => router.push('/note/calendar')}
        onBoard={() => router.push('/note/board')}
        onWrite={() => router.push('/note/write')}
        onBatchStatusChange={handleBatchStatusChange}
        onBatchDelete={handleBatchDelete}
        onBatchExit={exitBatch}
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

      <NoteListStates
        loading={loading}
        notesCount={notes.length}
        filteredCount={filtered.length}
        search={search}
        onCreate={() => router.push('/note/write')}
      />

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
        <NoteCardGrid
          visible={visible}
          filteredCount={filtered.length}
          batchMode={batchMode}
          selected={selected}
          pinnedIds={pinnedIds}
          popIds={popIds}
          hlRe={hlRe}
          onContextMenu={(note, e) => {
            e.preventDefault();
            const x = Math.min(e.clientX || 0, window.innerWidth - 180);
            const y = Math.min(e.clientY || 0, window.innerHeight - 220);
            setCtxMenu({ x, y, note });
          }}
          onToggleSelect={toggleSelect}
          onOpen={setDetailNote}
          onEdit={(note, e) => {
            e.stopPropagation();
            router.push(`/note/${note.id}`);
          }}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onStatusChange={handleStatusChange}
          onNewVersion={handleNewVersion}
          onPin={togglePin}
          onTagClick={tag => {
            setSearch(tag);
            setShowSearchHist(false);
          }}
          onLoadMore={() => setVisibleCount(v => v + PAGE_SIZE)}
        />
      )}

      {/* 테이블 뷰 */}
      {filtered.length > 0 && viewMode === 'table' && (
        <NoteTableView
          visible={visible}
          filtered={filtered}
          focusedRow={focusedRow}
          onFocusRow={setFocusedRow}
          onOpen={setDetailNote}
          onEdit={note => router.push(`/note/${note.id}`)}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onLoadMore={() => setVisibleCount(v => v + PAGE_SIZE)}
        />
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
