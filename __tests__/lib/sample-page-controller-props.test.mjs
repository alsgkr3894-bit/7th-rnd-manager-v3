import { jest } from '@jest/globals';
import { buildSamplePageControllerProps } from '@/app/note/sample/samplePageControllerProps';

const fn = () => jest.fn();

function createInputs(overrides = {}) {
  const router = { push: fn() };
  const pageState = {
    samples: [{ id: 's-1' }, { id: 's-2' }],
    search: '페퍼로니',
    searchHistory: ['페퍼로니'],
    showSearchHist: true,
    setShowSearchHist: fn(),
    catFilter: 'all',
    setCatFilter: fn(),
    ratingMin: 0,
    setRatingMin: fn(),
    sortBy: 'createdAt',
    applySortBy: fn(),
    viewMode: 'calendar',
    applyViewMode: fn(),
    calMonth: new Date(2026, 5, 1),
    goPrevMonth: fn(),
    goNextMonth: fn(),
    detailRec: { id: 's-2', title: '상세 샘플' },
    setDetailRec: fn(),
    loading: false,
    loadError: null,
    reload: fn(),
    handleSearchChange: fn(),
    closeSearchHistorySoon: fn(),
    selectSearchHistory: fn(),
    filtered: [{ id: 's-1' }],
    catCounts: { all: 2 },
    ratingDist: { none: 1 },
    calDays: [{ date: '2026-06-01' }],
    samplesByDate: { '2026-06-01': [{ id: 's-1' }] },
    today: '2026-06-16',
  };
  const batch = {
    batchMode: false,
    selected: new Set(['s-1']),
    handleBatchDelete: fn(),
    exitBatchMode: fn(),
    setBatchMode: fn(),
    toggleSelect: fn(),
    confirmOpen: false,
    confirmBatchDelete: fn(),
    setConfirmOpen: fn(),
  };
  const compare = {
    compareMode: false,
    setCompareMode: fn(),
    compareSet: new Set(['s-1', 's-2']),
    exitCompareMode: fn(),
    toggleCompare: fn(),
    compareIdxMap: new Map([['s-1', 0]]),
    setShowCompare: fn(),
    showCompare: false,
    compareItems: [{ id: 's-1' }, { id: 's-2' }],
  };
  const recordActions = {
    handleCopy: fn(),
    handleDelete: fn(),
    handleRatingChange: fn(),
  };

  return {
    router,
    pageState,
    batch,
    compare,
    recordActions,
    confirmElement: 'confirm-element',
    ...overrides,
  };
}

describe('buildSamplePageControllerProps', () => {
  test('샘플기록 화면 props와 route callback을 조립한다', () => {
    const inputs = createInputs();

    const props = buildSamplePageControllerProps(inputs);

    expect(props.headerProps.sub).toBe('총 2개 샘플');
    expect(props.actionsProps.filtered).toEqual([{ id: 's-1' }]);
    expect(props.filterProps.search).toBe('페퍼로니');
    expect(props.filterProps.categories).toContain('토핑식자재');
    expect(props.calendarVisible).toBe(true);
    expect(props.recordsProps.compareIdxMap).toBe(inputs.compare.compareIdxMap);
    expect(props.compareBarProps.compareCount).toBe(2);
    expect(props.dialogsProps.selectedCount).toBe(1);

    props.actionsProps.onCreateSample();
    props.recordsProps.onCreateSample();
    props.recordsProps.onEditSample({ id: 's-1' });
    props.dialogsProps.onEditDetail();

    expect(inputs.router.push).toHaveBeenNthCalledWith(1, '/note/sample/write');
    expect(inputs.router.push).toHaveBeenNthCalledWith(2, '/note/sample/write');
    expect(inputs.router.push).toHaveBeenNthCalledWith(3, '/note/sample/s-1');
    expect(inputs.router.push).toHaveBeenNthCalledWith(4, '/note/sample/s-2');
    expect(inputs.pageState.setDetailRec).toHaveBeenCalledWith(null);
  });

  test('검색, 비교, 배치, 상세 다이얼로그 callback은 원래 action을 위임한다', () => {
    const inputs = createInputs();

    const props = buildSamplePageControllerProps(inputs);

    props.actionsProps.onStartBatchMode();
    props.actionsProps.onStartCompareMode();
    props.filterProps.onSearchFocus();
    props.filterProps.onSearchBlur();
    props.compareBarProps.onOpenCompare();
    props.dialogsProps.onCloseCompare();
    props.dialogsProps.onCancelBatchDelete();
    props.dialogsProps.onDeleteDetail();

    expect(inputs.batch.setBatchMode).toHaveBeenCalledWith(true);
    expect(inputs.compare.setCompareMode).toHaveBeenCalledWith(true);
    expect(inputs.pageState.setShowSearchHist).toHaveBeenCalledWith(true);
    expect(inputs.pageState.closeSearchHistorySoon).toHaveBeenCalled();
    expect(inputs.compare.setShowCompare).toHaveBeenNthCalledWith(1, true);
    expect(inputs.compare.setShowCompare).toHaveBeenNthCalledWith(2, false);
    expect(inputs.batch.setConfirmOpen).toHaveBeenCalledWith(false);
    expect(inputs.recordActions.handleDelete).toHaveBeenCalledWith(inputs.pageState.detailRec);
  });

  test('로딩 중이거나 달력 view가 아니면 calendarVisible을 끈다', () => {
    expect(
      buildSamplePageControllerProps(
        createInputs({ pageState: { ...createInputs().pageState, loading: true } })
      ).calendarVisible
    ).toBe(false);
    expect(
      buildSamplePageControllerProps(
        createInputs({ pageState: { ...createInputs().pageState, viewMode: 'list' } })
      ).calendarVisible
    ).toBe(false);
  });
});
