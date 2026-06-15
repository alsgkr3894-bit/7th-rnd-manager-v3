'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NOTE_STATUS } from '@/lib/note/constants';
import { useNotePins } from '@/hooks/useNotePins';
import { useNoteBatchActions } from '@/hooks/useNoteBatchActions';
import { useNoteItemActions } from '@/hooks/useNoteItemActions';
import { useNoteListData } from '@/hooks/useNoteListData';
import { useNoteListState } from '@/hooks/useNoteListState';
import { useNoteReportingCopy } from '@/hooks/useNoteReportingCopy';
import { NoteFilterControls } from './_NoteFilterControls';
import { NoteStatsSummary } from './_NoteStatsSummary';
import { NotePresetBar } from './_NotePresetBar';
import { NoteListHeader } from './_NoteListHeader';
import { NoteListBody } from './_NoteListBody';
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

  const handleBulkCopy = useNoteReportingCopy(notes);
  const openNoteEditor = note => router.push(`/note/${note.id}`);

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

      <NoteListBody
        filtered={filtered}
        visible={visible}
        viewMode={viewMode}
        batchMode={batchMode}
        selected={selected}
        pinnedIds={pinnedIds}
        popIds={popIds}
        hlRe={hlRe}
        detailNote={detailNote}
        onOpenDetail={setDetailNote}
        onCloseDetail={() => setDetailNote(null)}
        onEditNote={openNoteEditor}
        onToggleSelect={toggleSelect}
        onTogglePin={togglePin}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onNewVersion={handleNewVersion}
        onTagClick={handleTagSearch}
        onLoadMore={loadMore}
      />
    </main>
  );
}
