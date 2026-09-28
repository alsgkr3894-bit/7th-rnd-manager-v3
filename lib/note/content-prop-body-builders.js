import { isUnifiedSampleRecord, unifiedSampleSourceId } from '@/lib/note/unified-records';

export function buildNoteBodyProps({
  canEdit = false,
  router,
  detailState,
  pins,
  listState,
  batchActions,
  itemActions,
}) {
  const { detailNote, setDetailNote } = detailState;
  const { pinnedIds, togglePin } = pins;
  const { filtered, visible, hlRe, viewMode, sortBy, handleTagSearch, loadMore } = listState;
  const { batchMode, selected, toggleSelect, handleDropMerge, handleUnmergeGroup } = batchActions;
  const {
    popIds,
    handleDelete,
    handleCopy,
    handleStatusChange,
    handleTypeChange,
    handleNewVersion,
  } = itemActions;

  const openNoteEditor = note => {
    if (isUnifiedSampleRecord(note)) {
      // 샘플 편집 화면은 저장/취소 후 기본적으로 샘플 목록으로 간다. 노트 목록에서 열었으면
      // 여기로 돌아와야 "수정했더니 다른 화면으로 튕겼다"는 느낌이 없다.
      router.push(`/note/sample/${unifiedSampleSourceId(note)}?from=note`);
      return;
    }
    router.push(`/note/${note.id}`);
  };

  return {
    filtered,
    visible,
    sortBy,
    canEdit,
    viewMode,
    batchMode,
    selected,
    pinnedIds,
    popIds,
    hlRe,
    detailNote,
    onOpenDetail: setDetailNote,
    onCloseDetail: () => setDetailNote(null),
    onEditNote: note => {
      if (canEdit) openNoteEditor(note);
    },
    onToggleSelect: toggleSelect,
    onDropMerge: handleDropMerge,
    onUnmergeGroup: handleUnmergeGroup,
    onTogglePin: togglePin,
    onCopy: handleCopy,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onTypeChange: handleTypeChange,
    onNewVersion: handleNewVersion,
    onTagClick: handleTagSearch,
    onLoadMore: loadMore,
  };
}
