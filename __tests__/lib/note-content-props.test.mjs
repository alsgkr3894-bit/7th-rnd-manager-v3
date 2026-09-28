import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildNoteContentProps } from '@/lib/note/content-props';
import {
  buildNoteDialogProps,
  buildNoteFilterProps,
  buildNoteHeaderProps,
} from '@/lib/note/content-prop-builders';

const fn = () => jest.fn();

function createInputs(overrides = {}) {
  const router = { push: fn() };
  const detailState = {
    detailNote: { id: 'detail-1' },
    setDetailNote: fn(),
  };
  const listState = {
    search: '트러플',
    statusFilter: 'all',
    sortBy: 'updatedAt',
    brandFilter: 'all',
    counts: {},
    filtered: [{ id: 'n-1' }],
    visible: [{ id: 'n-1' }],
    hlRe: /트러플/u,
    viewMode: 'table',
    presets: [{ name: '기본' }, { name: '보고' }],
    confirmDeletePreset: 1,
    setConfirmDeletePreset: fn(),
    savePreset: fn(),
    applyPreset: fn(),
    deletePreset: fn(),
    searchHistory: ['트러플'],
    showSearchHist: true,
    setShowSearchHist: fn(),
    saveSearchHistory: fn(),
    cancelSearchHistory: fn(),
    closeSearchHistorySoon: fn(),
    handleSearchChange: fn(),
    applySearchHistory: fn(),
    changeSort: fn(),
    changeView: fn(),
    changeBrandFilter: fn(),
    changeStatusFilter: fn(),
    openChecklistList: fn(),
    handleTagSearch: fn(),
    loadMore: fn(),
    hasActiveFilter: true,
  };
  const batchActions = {
    batchMode: true,
    setBatchMode: fn(),
    selected: new Set(['n-1', 'n-2']),
    confirmBatch: true,
    setConfirmBatch: fn(),
    confirmMerge: true,
    setConfirmMerge: fn(),
    pendingDropMerge: {
      title: '타깃 메뉴',
      sourceCount: 2,
      mergedCount: 4,
    },
    setPendingDropMerge: fn(),
    pendingUnmerge: {
      title: '타깃 메뉴',
      unmergedCount: 4,
    },
    setPendingUnmerge: fn(),
    toggleSelect: fn(),
    exitBatch: fn(),
    handleBatchDelete: fn(),
    handleBatchMerge: fn(),
    handleBatchStatusChange: fn(),
    confirmBatchDelete: fn(),
    confirmBatchMerge: fn(),
    confirmDropMerge: fn(),
    handleDropMerge: fn(),
    handleUnmergeGroup: fn(),
    confirmUnmergeGroup: fn(),
  };
  const itemActions = {
    popIds: new Set(['n-1']),
    singleDeleteNote: { id: 'n-2' },
    setSingleDeleteNote: fn(),
    handleDelete: fn(),
    execDelete: fn(),
    handleCopy: fn(),
    handleStatusChange: fn(),
    handleNewVersion: fn(),
  };

  return {
    canEdit: true,
    router,
    notesState: {
      notes: [{ id: 'n-1' }, { id: 'n-2' }],
      stats: { total: 2 },
      loading: false,
    },
    detailState,
    pins: {
      pinnedIds: new Set(['n-1']),
      togglePin: fn(),
    },
    listState,
    handleReportPdf: fn(),
    batchActions,
    itemActions,
    ...overrides,
  };
}

describe('buildNoteContentProps', () => {
  test('노트 목록 화면에 필요한 props와 route callback을 조립한다', () => {
    const inputs = createInputs();

    const props = buildNoteContentProps(inputs);

    expect(props.headerProps.notesCount).toBe(2);
    expect(props.headerProps.reportingCount).toBeUndefined();
    expect(props.headerProps.reportExportCount).toBe(1);
    expect(props.statsProps.stats).toEqual({ total: 2 });
    expect(props.filterProps.search).toBe('트러플');
    expect(props.presetProps.hasActiveFilter).toBe(true);
    expect(props.statesProps.filteredCount).toBe(1);
    expect(props.bodyProps.detailNote).toEqual({ id: 'detail-1' });
    expect(props.bodyProps.onUnmergeGroup).toBe(inputs.batchActions.handleUnmergeGroup);

    props.headerProps.onCalendar();
    props.headerProps.onChecklist();
    props.headerProps.onBoard();
    props.headerProps.onExportReportPdf();
    props.headerProps.onWrite();
    props.statesProps.onCreate();
    props.bodyProps.onEditNote({ id: 'n-1' });

    expect(inputs.router.push).toHaveBeenNthCalledWith(1, '/note/calendar');
    expect(inputs.listState.openChecklistList).toHaveBeenCalled();
    expect(inputs.router.push).toHaveBeenNthCalledWith(2, '/note/board');
    expect(inputs.handleReportPdf).toHaveBeenCalled();
    expect(inputs.router.push).toHaveBeenNthCalledWith(3, '/note/write');
    expect(inputs.router.push).toHaveBeenNthCalledWith(4, '/note/write');
    expect(inputs.router.push).toHaveBeenNthCalledWith(5, '/note/n-1');
  });

  test('확인 다이얼로그와 검색 callback은 원래 action을 위임한다', () => {
    const inputs = createInputs();

    const props = buildNoteContentProps(inputs);

    props.dialogsProps.onCancelBatchDelete();
    props.dialogsProps.onCancelBatchMerge();
    props.dialogsProps.onCancelDropMerge();
    props.dialogsProps.onCancelUnmerge();
    props.dialogsProps.onConfirmPresetDelete();
    props.dialogsProps.onCancelSingleDelete();
    props.filterProps.onSearchSubmit();
    props.filterProps.onSearchFocus();
    props.filterProps.onSearchBlur();

    expect(inputs.batchActions.setConfirmBatch).toHaveBeenCalledWith(false);
    expect(inputs.batchActions.setConfirmMerge).toHaveBeenCalledWith(false);
    expect(inputs.batchActions.setPendingDropMerge).toHaveBeenCalledWith(null);
    expect(inputs.batchActions.setPendingUnmerge).toHaveBeenCalledWith(null);
    expect(inputs.listState.deletePreset).toHaveBeenCalledWith(1);
    expect(inputs.listState.setConfirmDeletePreset).toHaveBeenCalledWith(null);
    expect(inputs.itemActions.setSingleDeleteNote).toHaveBeenCalledWith(null);
    expect(inputs.listState.saveSearchHistory).toHaveBeenCalledWith('트러플');
    expect(inputs.listState.setShowSearchHist).toHaveBeenCalledWith(true);
    expect(inputs.listState.cancelSearchHistory).toHaveBeenCalled();
    expect(inputs.listState.closeSearchHistorySoon).toHaveBeenCalled();
  });

  test('하위 builder는 주요 prop 그룹을 독립적으로 조립한다', () => {
    const inputs = createInputs();

    const headerProps = buildNoteHeaderProps(inputs);
    const filterProps = buildNoteFilterProps(inputs);
    const dialogsProps = buildNoteDialogProps(inputs);

    expect(headerProps.notesCount).toBe(2);
    expect(headerProps.reportingCount).toBeUndefined();
    expect(headerProps.reportExportCount).toBe(1);
    expect(filterProps.search).toBe('트러플');
    expect(filterProps.showSearchHistory).toBe(true);
    expect(dialogsProps.selectedCount).toBe(2);
    expect(dialogsProps.confirmMerge).toBe(true);
    expect(dialogsProps.dropMergeOpen).toBe(true);
    expect(dialogsProps.dropMergeSourceCount).toBe(2);
    expect(dialogsProps.dropMergeMergedCount).toBe(4);
    expect(dialogsProps.unmergeOpen).toBe(true);
    expect(dialogsProps.unmergeCount).toBe(4);
    expect(dialogsProps.presetName).toBe('보고');

    headerProps.onEnterBatchMode();
    headerProps.onBatchMerge();
    headerProps.onExportReportPdf();
    filterProps.onSearchSubmit();
    dialogsProps.onConfirmDropMerge();
    dialogsProps.onConfirmUnmerge();
    dialogsProps.onConfirmPresetDelete();

    expect(inputs.batchActions.setBatchMode).toHaveBeenCalledWith(true);
    expect(inputs.batchActions.handleBatchMerge).toHaveBeenCalled();
    expect(inputs.handleReportPdf).toHaveBeenCalled();
    expect(inputs.listState.saveSearchHistory).toHaveBeenCalledWith('트러플');
    expect(inputs.batchActions.confirmDropMerge).toHaveBeenCalled();
    expect(inputs.batchActions.confirmUnmergeGroup).toHaveBeenCalled();
    expect(inputs.listState.deletePreset).toHaveBeenCalledWith(1);
    expect(inputs.listState.setConfirmDeletePreset).toHaveBeenCalledWith(null);
  });

  /**
   * 회귀 방지(2026-09-28): 노트 목록에서 샘플 기록을 수정하면 저장 후 샘플 목록으로
   * 튕겨 "수정했더니 다른 화면으로 갔다"가 됐다. 출처를 ?from=note로 넘겨 돌아오게 한다.
   */
  test('노트 목록에서 연 샘플 편집은 돌아올 출처(from=note)를 달고 간다', () => {
    const inputs = createInputs();
    const props = buildNoteContentProps(inputs);

    props.bodyProps.onEditNote({ id: 'sample:7', _recordKind: 'sample' });
    expect(inputs.router.push).toHaveBeenCalledWith('/note/sample/7?from=note');
  });

  test('일반 노트는 기존대로 노트 편집 화면으로 간다', () => {
    const inputs = createInputs();
    const props = buildNoteContentProps(inputs);

    props.bodyProps.onEditNote({ id: 'n-9' });
    expect(inputs.router.push).toHaveBeenCalledWith('/note/n-9');
  });
});

/**
 * 샘플 편집 화면이 출처를 실제로 해석하는지 — 소스 기준 확인.
 * (화면 전체 렌더는 IndexedDB·라우터 의존이 커서 라우팅 규칙만 고정한다.)
 */
describe('샘플 편집 화면의 돌아갈 곳', () => {
  const src = readFileSync(resolve('app/note/sample/[id]/page.jsx'), 'utf8');

  test('아는 출처만 매핑하고 기본값은 샘플 목록', () => {
    expect(src).toContain("const BACK_TO = { note: '/note' };");
    expect(src).toContain("const SAMPLE_LIST = '/note/sample';");
    expect(src).toContain("get('from')");
  });

  test('저장·취소·로드실패가 모두 backTo를 쓴다 (하드코딩 경로 없음)', () => {
    expect(src).toContain('router.push(backTo)');
    expect(src).toContain('router.replace(backTo)');
    // 상수 정의를 뺀 나머지 자리에 '/note/sample' 하드코딩이 남아있으면 안 된다
    const withoutConst = src.replace("const SAMPLE_LIST = '/note/sample';", '');
    expect(withoutConst).not.toContain("'/note/sample'");
  });
});
