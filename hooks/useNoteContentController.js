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

export function useNoteContentController() {
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

  return {
    dialogsProps: {
      confirmBatch,
      selectedCount: selected.size,
      onConfirmBatchDelete: confirmBatchDelete,
      onCancelBatchDelete: () => setConfirmBatch(false),
      confirmDeletePreset,
      presetName: presets[confirmDeletePreset]?.name,
      onConfirmPresetDelete: () => {
        deletePreset(confirmDeletePreset);
        setConfirmDeletePreset(null);
      },
      onCancelPresetDelete: () => setConfirmDeletePreset(null),
      singleDeleteOpen: singleDeleteNote !== null,
      onConfirmSingleDelete: () => execDelete(singleDeleteNote),
      onCancelSingleDelete: () => setSingleDeleteNote(null),
    },
    headerProps: {
      notesCount: notes.length,
      batchMode,
      selected,
      reportingCount: counts[NOTE_STATUS.REPORTING],
      onBulkCopy: handleBulkCopy,
      onEnterBatchMode: () => setBatchMode(true),
      onCalendar: () => router.push('/note/calendar'),
      onBoard: () => router.push('/note/board'),
      onWrite: () => router.push('/note/write'),
      onBatchStatusChange: handleBatchStatusChange,
      onBatchDelete: handleBatchDelete,
      onBatchExit: exitBatch,
    },
    statsProps: {
      stats,
      counts,
    },
    filterProps: {
      brandFilter,
      statusFilter,
      counts,
      sortBy,
      viewMode,
      search,
      searchHistory,
      showSearchHistory: showSearchHist,
      onBrandFilter: changeBrandFilter,
      onStatusFilter: changeStatusFilter,
      onSort: changeSort,
      onView: changeView,
      onSearchChange: handleSearchChange,
      onSearchSubmit: () => saveSearchHistory(search),
      onSearchFocus: () => setShowSearchHist(true),
      onSearchBlur: () => {
        cancelSearchHistory();
        closeSearchHistorySoon();
      },
      onSearchHistoryPick: applySearchHistory,
    },
    presetProps: {
      presets,
      hasActiveFilter,
      onApply: applyPreset,
      onSave: savePreset,
      onDelete: idx => setConfirmDeletePreset(idx),
    },
    statesProps: {
      loading,
      notesCount: notes.length,
      filteredCount: filtered.length,
      search,
      onCreate: () => router.push('/note/write'),
    },
    bodyProps: {
      filtered,
      visible,
      viewMode,
      batchMode,
      selected,
      pinnedIds,
      popIds,
      hlRe,
      detailNote,
      onOpenDetail: setDetailNote,
      onCloseDetail: () => setDetailNote(null),
      onEditNote: openNoteEditor,
      onToggleSelect: toggleSelect,
      onTogglePin: togglePin,
      onCopy: handleCopy,
      onDelete: handleDelete,
      onStatusChange: handleStatusChange,
      onNewVersion: handleNewVersion,
      onTagClick: handleTagSearch,
      onLoadMore: loadMore,
    },
  };
}
