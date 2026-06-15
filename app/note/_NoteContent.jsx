'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NOTE_STATUS } from '@/lib/note/constants';
import { useNotePins } from '@/hooks/useNotePins';
import { useNoteBatchActions } from '@/hooks/useNoteBatchActions';
import { useNoteItemActions } from '@/hooks/useNoteItemActions';
import { useNoteListData } from '@/hooks/useNoteListData';
import { useNoteListState } from '@/hooks/useNoteListState';
import { useNoteReportingCopy } from '@/hooks/useNoteReportingCopy';
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

export function NoteContent() {
  const router = useRouter();
  const pathname = usePathname();

  const { notes, setNotes, stats, loading, load } = useNoteListData();
  const [detailNote, setDetailNote] = useState(null);
  const { pinnedIds, togglePin } = useNotePins();
  const {
    search,
    statusFilter,
    sortBy,
    brandFilter,
    counts,
    filtered,
    visible,
    hlRe,
    viewMode,
    presets,
    confirmDeletePreset,
    setConfirmDeletePreset,
    savePreset,
    applyPreset,
    deletePreset,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    saveSearchHistory,
    cancelSearchHistory,
    closeSearchHistorySoon,
    handleSearchChange,
    applySearchHistory,
    changeSort,
    changeView,
    changeBrandFilter,
    changeStatusFilter,
    handleTagSearch,
    loadMore,
    hasActiveFilter,
  } = useNoteListState({ notes, pinnedIds, pathname });

  const [ctxMenu, setCtxMenu] = useState(null);
  const [focusedRow, setFocusedRow] = useState(null);
  const handleBulkCopy = useNoteReportingCopy(notes);

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
    if (!ctxMenu) return;
    const handler = e => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu]);

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
          onTagClick={handleTagSearch}
          onLoadMore={loadMore}
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
          onLoadMore={loadMore}
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
