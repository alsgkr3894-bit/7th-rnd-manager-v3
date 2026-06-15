import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/note/sample/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/note/sample/_SamplePageActions.jsx'), 'utf8');
const filtersSource = readFileSync(resolve('app/note/sample/_SampleFilterControls.jsx'), 'utf8');
const categoryFilterSource = readFileSync(
  resolve('app/note/sample/_SampleCategoryFilter.jsx'),
  'utf8'
);
const ratingViewSource = readFileSync(
  resolve('app/note/sample/_SampleRatingViewControls.jsx'),
  'utf8'
);
const chipOptionGroupSource = readFileSync(
  resolve('app/note/sample/_SampleChipOptionGroup.jsx'),
  'utf8'
);
const ratingFilterGroupSource = readFileSync(
  resolve('app/note/sample/_SampleRatingFilterGroup.jsx'),
  'utf8'
);
const searchFieldSource = readFileSync(resolve('app/note/sample/_SampleSearchField.jsx'), 'utf8');
const calendarSource = readFileSync(resolve('app/note/sample/_SampleCalendarView.jsx'), 'utf8');
const compareBarSource = readFileSync(resolve('app/note/sample/_SampleCompareBar.jsx'), 'utf8');
const pageDialogsSource = readFileSync(resolve('app/note/sample/_SamplePageDialogs.jsx'), 'utf8');
const recordsSource = readFileSync(resolve('app/note/sample/_SampleRecordsView.jsx'), 'utf8');
const loadingGridSource = readFileSync(resolve('app/note/sample/_SampleLoadingGrid.jsx'), 'utf8');
const emptyStateSource = readFileSync(resolve('app/note/sample/_SampleEmptyState.jsx'), 'utf8');
const gridViewSource = readFileSync(resolve('app/note/sample/_SampleGridView.jsx'), 'utf8');
const listViewSource = readFileSync(resolve('app/note/sample/_SampleListView.jsx'), 'utf8');
const controllerSource = readFileSync(
  resolve('app/note/sample/useSamplePageController.js'),
  'utf8'
);
const controllerPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerProps.js'),
  'utf8'
);
const controllerTopPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerTopProps.js'),
  'utf8'
);
const controllerViewPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerViewProps.js'),
  'utf8'
);
const controllerFilterPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerFilterProps.js'),
  'utf8'
);
const controllerCalendarPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerCalendarProps.js'),
  'utf8'
);
const controllerRecordsPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerRecordsProps.js'),
  'utf8'
);
const controllerDialogPropsSource = readFileSync(
  resolve('app/note/sample/samplePageControllerDialogProps.js'),
  'utf8'
);
const stateHookSource = readFileSync(resolve('app/note/sample/useSamplePageState.js'), 'utf8');
const filterStateHookSource = readFileSync(
  resolve('app/note/sample/useSamplePageFilterState.js'),
  'utf8'
);
const filterStateUtilsSource = readFileSync(
  resolve('app/note/sample/samplePageFilterStateUtils.js'),
  'utf8'
);
const stateUtilsSource = readFileSync(resolve('app/note/sample/samplePageStateUtils.js'), 'utf8');
const actionsHookSource = readFileSync(
  resolve('app/note/sample/useSampleRecordActions.js'),
  'utf8'
);

describe('sample page structure', () => {
  test('sample page delegates major rendering sections to focused components', () => {
    expect(pageSource).toContain("import { SamplePageActions } from './_SamplePageActions'");
    expect(pageSource).toContain("import { SampleFilterControls } from './_SampleFilterControls'");
    expect(pageSource).toContain("import { SampleCalendarView } from './_SampleCalendarView'");
    expect(pageSource).toContain("import { SampleCompareBar } from './_SampleCompareBar'");
    expect(pageSource).toContain("import { SamplePageDialogs } from './_SamplePageDialogs'");
    expect(pageSource).toContain("import { SampleRecordsView } from './_SampleRecordsView'");
    expect(pageSource).toContain(
      "import { useSamplePageController } from './useSamplePageController'"
    );
    expect(pageSource).toContain('<SamplePageActions');
    expect(pageSource).toContain('<SampleFilterControls');
    expect(pageSource).toContain('<SampleCalendarView');
    expect(pageSource).toContain('<SampleCompareBar');
    expect(pageSource).toContain('<SamplePageDialogs');
    expect(pageSource).toContain('<SampleRecordsView');
    expect(pageSource).toContain('useSamplePageController()');
    expect(pageSource).toContain('actions={<SamplePageActions {...actionsProps} />}');
    expect(pageSource).toContain('<SampleFilterControls {...filterProps} />');
    expect(pageSource).toContain('<SampleRecordsView {...recordsProps} />');
    expect(pageSource).toContain('<SamplePageDialogs {...dialogsProps} />');
    expect(pageSource).not.toContain('downloadCsv');
    expect(pageSource).not.toContain('printCurrentPageWithDownloadDate');
    expect(pageSource).not.toContain('useRouter');
    expect(pageSource).not.toContain('useSearchParams');
    expect(pageSource).not.toContain('usePathname');
    expect(pageSource).not.toContain('useSamplePageState({ searchParams, pathname })');
    expect(pageSource).not.toContain('useSampleRecordActions({');
    expect(pageSource).not.toContain('useSampleBatchMode');
    expect(pageSource).not.toContain('useSampleCompareMode');
    expect(pageSource).not.toContain('useConfirmDialog');
    expect(pageSource).not.toContain('SAMPLE_CATEGORIES');
    expect(pageSource).not.toContain('SAMPLE_SORT_OPTIONS');
    expect(pageSource).not.toContain('<ConfirmDialog');
    expect(pageSource).not.toContain('<CompareModal');
    expect(pageSource).not.toContain('<SampleDetailModal');
    expect(pageSource).not.toContain("position: 'fixed'");
    expect(pageSource).not.toContain('SampleCardSkeleton');
    expect(pageSource).not.toContain('<SampleCard');
    expect(pageSource).not.toContain('<SampleListRow');
    expect(pageSource).not.toContain('className="sample-filter-row"');
    expect(pageSource).not.toContain('className="cal-grid"');
    expect(pageSource).not.toContain('첫 샘플 작성하기');
    expect(pageSource).not.toContain('엑셀로 내보내기');
    expect(pageSource).not.toContain('getAllSamples');
    expect(pageSource).not.toContain('useDBLoad');
    expect(pageSource).not.toContain('useVisibilityRefresh');
    expect(pageSource).not.toContain('useSearchHistory');
    expect(pageSource).not.toContain('sampleNamesText');
    expect(pageSource).not.toContain('buildCalendarDays');
    expect(pageSource).not.toContain('addSample');
    expect(pageSource).not.toContain('updateSample');
    expect(pageSource).not.toContain('deleteSample');
    expect(pageSource).not.toContain('initDB');
  });

  test('extracted components own their sample page rendering responsibilities', () => {
    expect(actionsSource).toContain('export function SamplePageActions');
    expect(actionsSource).toContain('downloadCsv');
    expect(actionsSource).toContain('printCurrentPageWithDownloadDate');
    expect(actionsSource).toContain('엑셀로 내보내기');
    expect(filtersSource).toContain('export function SampleFilterControls');
    expect(filtersSource).toContain('<SampleCategoryFilter');
    expect(filtersSource).toContain('<SampleRatingViewControls');
    expect(filtersSource).toContain('<SampleSearchField');
    expect(filtersSource).not.toContain('className="sample-filter-row"');
    expect(filtersSource).not.toContain('제목, 메뉴명, 내용, 태그 검색');
    expect(categoryFilterSource).toContain('export function SampleCategoryFilter');
    expect(categoryFilterSource).toContain(
      "className={'chip' + (catFilter === key ? ' active' : '')}"
    );
    expect(ratingViewSource).toContain('export function SampleRatingViewControls');
    expect(ratingViewSource).toContain('className="sample-filter-row"');
    expect(ratingViewSource).toContain('<SampleRatingFilterGroup');
    expect(ratingViewSource).toContain('<SampleChipOptionGroup');
    expect(ratingViewSource).toContain('const VIEW_OPTIONS = [');
    expect(ratingViewSource).not.toContain('const RATING_FILTERS = [');
    expect(chipOptionGroupSource).toContain('export function SampleChipOptionButtons');
    expect(chipOptionGroupSource).toContain('export function SampleChipOptionGroup');
    expect(chipOptionGroupSource).toContain(
      "className={'chip' + (activeValue === value ? ' active' : '')}"
    );
    expect(ratingFilterGroupSource).toContain('export function SampleRatingFilterGroup');
    expect(ratingFilterGroupSource).toContain('const RATING_FILTERS = [');
    expect(ratingFilterGroupSource).toContain('className="sample-rating-row"');
    expect(ratingFilterGroupSource).toContain('className="sample-rating-dist"');
    expect(searchFieldSource).toContain('export function SampleSearchField');
    expect(searchFieldSource).toContain('제목, 메뉴명, 내용, 태그 검색');
    expect(searchFieldSource).toContain('<Icon.search');
    expect(calendarSource).toContain('export function SampleCalendarView');
    expect(calendarSource).toContain('className="cal-grid"');
    expect(calendarSource).toContain('RATING_COLOR');
    expect(compareBarSource).toContain('export function SampleCompareBar');
    expect(compareBarSource).toContain("position: 'fixed'");
    expect(compareBarSource).toContain('개 비교하기');
    expect(pageDialogsSource).toContain('export function SamplePageDialogs');
    expect(pageDialogsSource).toContain('<SampleDetailModal');
    expect(pageDialogsSource).toContain('<CompareModal');
    expect(pageDialogsSource).toContain('<ConfirmDialog');
    expect(pageDialogsSource).toContain('샘플 ${selectedCount}개를 삭제할까요?');
    expect(recordsSource).toContain('export function SampleRecordsView');
    expect(recordsSource).toContain('<SampleLoadingGrid');
    expect(recordsSource).toContain('<SampleEmptyState');
    expect(recordsSource).toContain('<SampleGridView');
    expect(recordsSource).toContain('<SampleListView');
    expect(recordsSource).not.toContain('SampleCardSkeleton');
    expect(recordsSource).not.toContain('<SampleCard');
    expect(recordsSource).not.toContain('<SampleListRow');
    expect(recordsSource).not.toContain('첫 샘플 작성하기');
    expect(recordsSource).not.toContain('className="data-table"');
    expect(loadingGridSource).toContain('export function SampleLoadingGrid');
    expect(loadingGridSource).toContain('SampleCardSkeleton');
    expect(emptyStateSource).toContain('export function SampleEmptyState');
    expect(emptyStateSource).toContain('첫 샘플 작성하기');
    expect(emptyStateSource).toContain('샘플 기록이 없어요');
    expect(gridViewSource).toContain('export function SampleGridView');
    expect(gridViewSource).toContain('<SampleCard');
    expect(gridViewSource).toContain('animDelay={Math.min(index, 8) * 40}');
    expect(listViewSource).toContain('export function SampleListView');
    expect(listViewSource).toContain('<SampleListRow');
    expect(listViewSource).toContain('className="data-table"');
  });

  test('sample hooks own page data state and record mutations', () => {
    expect(controllerSource).toContain('export function useSamplePageController');
    expect(controllerSource).toContain('useRouter()');
    expect(controllerSource).toContain('useSearchParams()');
    expect(controllerSource).toContain('usePathname()');
    expect(controllerSource).toContain('useSamplePageState({ searchParams, pathname })');
    expect(controllerSource).toContain('useSampleBatchMode(');
    expect(controllerSource).toContain('useConfirmDialog()');
    expect(controllerSource).toContain('useSampleRecordActions({');
    expect(controllerSource).toContain('useSampleCompareMode(samples)');
    expect(controllerSource).toContain(
      "import { buildSamplePageControllerProps } from './samplePageControllerProps'"
    );
    expect(controllerSource).toContain('return buildSamplePageControllerProps({');
    expect(controllerSource).not.toContain('loadErrorProps');
    expect(controllerSource).not.toContain("router.push('/note/sample/write')");
    expect(controllerPropsSource).toContain('export function buildSamplePageControllerProps');
    expect(controllerPropsSource).toContain('loadErrorProps');
    expect(controllerPropsSource).toContain('actionsProps');
    expect(controllerPropsSource).toContain('filterProps');
    expect(controllerPropsSource).toContain('recordsProps');
    expect(controllerPropsSource).toContain('dialogsProps');
    expect(controllerPropsSource).toContain("from './samplePageControllerTopProps'");
    expect(controllerPropsSource).toContain("from './samplePageControllerViewProps'");
    expect(controllerPropsSource).toContain("from './samplePageControllerDialogProps'");
    expect(controllerPropsSource).toContain('buildSampleActionsProps(context)');
    expect(controllerPropsSource).toContain('buildSampleFilterProps(context)');
    expect(controllerPropsSource).toContain('buildSampleDialogsProps(context)');
    expect(controllerPropsSource).toContain("router.push('/note/sample/write')");
    expect(controllerPropsSource).toContain('router.push(`/note/sample/${sample.id}`)');
    expect(controllerPropsSource).not.toContain("from '@/lib/sample/constants'");
    expect(controllerPropsSource).not.toContain("from './samplePageStateUtils'");
    expect(controllerTopPropsSource).toContain('export function buildSampleLoadErrorProps');
    expect(controllerTopPropsSource).toContain('export function buildSampleHeaderProps');
    expect(controllerTopPropsSource).toContain('export function buildSampleActionsProps');
    expect(controllerTopPropsSource).toContain('onStartBatchMode: () => batch.setBatchMode(true)');
    expect(controllerViewPropsSource).toContain(
      "export { buildSampleFilterProps } from './samplePageControllerFilterProps'"
    );
    expect(controllerViewPropsSource).toContain(
      "export { buildSampleCalendarProps } from './samplePageControllerCalendarProps'"
    );
    expect(controllerViewPropsSource).toContain(
      "export { buildSampleRecordsProps } from './samplePageControllerRecordsProps'"
    );
    expect(controllerViewPropsSource).not.toContain("from '@/lib/sample/constants'");
    expect(controllerViewPropsSource).not.toContain("from './samplePageStateUtils'");
    expect(controllerViewPropsSource).not.toContain('onSearchBlur: closeSearchHistorySoon');
    expect(controllerFilterPropsSource).toContain('export function buildSampleFilterProps');
    expect(controllerFilterPropsSource).toContain("from '@/lib/sample/constants'");
    expect(controllerFilterPropsSource).toContain("from './samplePageStateUtils'");
    expect(controllerFilterPropsSource).toContain('onSearchBlur: closeSearchHistorySoon');
    expect(controllerCalendarPropsSource).toContain('export function buildSampleCalendarProps');
    expect(controllerCalendarPropsSource).toContain('onOpenSample: setDetailRec');
    expect(controllerRecordsPropsSource).toContain('export function buildSampleRecordsProps');
    expect(controllerRecordsPropsSource).toContain('onCreateSample: openWrite');
    expect(controllerDialogPropsSource).toContain('export function buildSampleCompareBarProps');
    expect(controllerDialogPropsSource).toContain('export function buildSampleDialogsProps');
    expect(controllerDialogPropsSource).toContain(
      'onDeleteDetail: () => detailRec && recordActions.handleDelete(detailRec)'
    );
    expect(stateHookSource).toContain('export function useSamplePageState');
    expect(stateHookSource).toContain('export { SAMPLE_SORT_OPTIONS }');
    expect(stateHookSource).toContain('useSamplePageFilterState({ searchParams, pathname })');
    expect(stateHookSource).toContain('getAllSamples');
    expect(stateHookSource).toContain('useDBLoad(() => getAllSamples())');
    expect(stateHookSource).toContain('useVisibilityRefresh(reload)');
    expect(stateHookSource).toContain('filterSortSamples(samples');
    expect(stateHookSource).toContain('buildSampleCategoryCounts(samples)');
    expect(stateHookSource).toContain('buildSampleRatingDist(samples)');
    expect(stateHookSource).toContain('buildSampleCalendarDays(calMonth)');
    expect(stateHookSource).toContain('buildSamplesByDate(samples)');
    expect(stateHookSource).not.toContain('sampleNamesText(sample)');
    expect(stateHookSource).not.toContain('buildCalendarDays(calMonth, CALENDAR_CELLS)');
    expect(stateHookSource).not.toContain('useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY)');
    expect(stateHookSource).not.toContain('setLS(KEYS.SAMPLE_SORT, key)');
    expect(stateHookSource).not.toContain('setLS(KEYS.SAMPLE_VIEW, mode)');
    expect(filterStateHookSource).toContain('export function useSamplePageFilterState');
    expect(filterStateHookSource).toContain('useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY)');
    expect(filterStateHookSource).toContain("from './samplePageFilterStateUtils'");
    expect(filterStateHookSource).toContain('window.history.replaceState');
    expect(filterStateHookSource).toContain(
      'buildSampleFilterPath({ pathname, catFilter, ratingMin })'
    );
    expect(filterStateHookSource).toContain('persistSampleSortBy(key)');
    expect(filterStateHookSource).toContain('persistSampleViewMode(mode)');
    expect(filterStateHookSource).toContain('closeSearchHistorySoon');
    expect(filterStateHookSource).toContain('selectSearchHistory');
    expect(filterStateHookSource).not.toContain('new URLSearchParams');
    expect(filterStateHookSource).not.toContain('setLS(KEYS.SAMPLE_SORT, key)');
    expect(filterStateHookSource).not.toContain('setLS(KEYS.SAMPLE_VIEW, mode)');
    expect(filterStateUtilsSource).toContain('export function buildSampleFilterPath');
    expect(filterStateUtilsSource).toContain('export function readSampleRatingMin');
    expect(filterStateUtilsSource).toContain('setLS(KEYS.SAMPLE_SORT, key)');
    expect(filterStateUtilsSource).toContain('setLS(KEYS.SAMPLE_VIEW, mode)');
    expect(filterStateHookSource).not.toContain('getAllSamples');
    expect(filterStateHookSource).not.toContain('filterSortSamples(samples');
    expect(stateUtilsSource).toContain('export function filterSortSamples');
    expect(stateUtilsSource).toContain('export function buildSampleCategoryCounts');
    expect(stateUtilsSource).toContain('export function buildSampleRatingDist');
    expect(stateUtilsSource).toContain('export function buildSampleCalendarDays');
    expect(stateUtilsSource).toContain('export function buildSamplesByDate');
    expect(stateUtilsSource).toContain('export const SAMPLE_SORT_OPTIONS');
    expect(stateUtilsSource).toContain('sampleNamesText(sample)');
    expect(stateUtilsSource).toContain('buildCalendarDays(calMonth, CALENDAR_CELLS)');
    expect(actionsHookSource).toContain('export function useSampleRecordActions');
    expect(actionsHookSource).toContain('await deleteSample(sample.id)');
    expect(actionsHookSource).toContain('await addSample({ ...sample');
    expect(actionsHookSource).toContain('await updateSample(sampleId');
    expect(actionsHookSource).toContain('await initDB()');
    expect(actionsHookSource).toContain("showToast('샘플을 복사했어요', 'ok')");
  });
});
