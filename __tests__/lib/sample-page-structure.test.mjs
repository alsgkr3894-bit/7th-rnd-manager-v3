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
const searchFieldSource = readFileSync(resolve('app/note/sample/_SampleSearchField.jsx'), 'utf8');
const calendarSource = readFileSync(resolve('app/note/sample/_SampleCalendarView.jsx'), 'utf8');
const compareBarSource = readFileSync(resolve('app/note/sample/_SampleCompareBar.jsx'), 'utf8');
const pageDialogsSource = readFileSync(resolve('app/note/sample/_SamplePageDialogs.jsx'), 'utf8');
const recordsSource = readFileSync(resolve('app/note/sample/_SampleRecordsView.jsx'), 'utf8');
const loadingGridSource = readFileSync(resolve('app/note/sample/_SampleLoadingGrid.jsx'), 'utf8');
const emptyStateSource = readFileSync(resolve('app/note/sample/_SampleEmptyState.jsx'), 'utf8');
const gridViewSource = readFileSync(resolve('app/note/sample/_SampleGridView.jsx'), 'utf8');
const listViewSource = readFileSync(resolve('app/note/sample/_SampleListView.jsx'), 'utf8');
const stateHookSource = readFileSync(resolve('app/note/sample/useSamplePageState.js'), 'utf8');
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
      "import { SAMPLE_SORT_OPTIONS, useSamplePageState } from './useSamplePageState'"
    );
    expect(pageSource).toContain(
      "import { useSampleRecordActions } from './useSampleRecordActions'"
    );
    expect(pageSource).toContain('<SamplePageActions');
    expect(pageSource).toContain('<SampleFilterControls');
    expect(pageSource).toContain('<SampleCalendarView');
    expect(pageSource).toContain('<SampleCompareBar');
    expect(pageSource).toContain('<SamplePageDialogs');
    expect(pageSource).toContain('<SampleRecordsView');
    expect(pageSource).toContain('useSamplePageState({ searchParams, pathname })');
    expect(pageSource).toContain('useSampleRecordActions({');
    expect(pageSource).not.toContain('downloadCsv');
    expect(pageSource).not.toContain('printCurrentPageWithDownloadDate');
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
    expect(ratingViewSource).toContain('const VIEW_OPTIONS = [');
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
    expect(stateHookSource).toContain('export function useSamplePageState');
    expect(stateHookSource).toContain('export { SAMPLE_SORT_OPTIONS }');
    expect(stateHookSource).toContain('getAllSamples');
    expect(stateHookSource).toContain('useDBLoad(() => getAllSamples())');
    expect(stateHookSource).toContain('useVisibilityRefresh(reload)');
    expect(stateHookSource).toContain('useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY)');
    expect(stateHookSource).toContain('filterSortSamples(samples');
    expect(stateHookSource).toContain('buildSampleCategoryCounts(samples)');
    expect(stateHookSource).toContain('buildSampleRatingDist(samples)');
    expect(stateHookSource).toContain('buildSampleCalendarDays(calMonth)');
    expect(stateHookSource).toContain('buildSamplesByDate(samples)');
    expect(stateHookSource).not.toContain('sampleNamesText(sample)');
    expect(stateHookSource).not.toContain('buildCalendarDays(calMonth, CALENDAR_CELLS)');
    expect(stateHookSource).toContain('setLS(KEYS.SAMPLE_SORT, key)');
    expect(stateHookSource).toContain('setLS(KEYS.SAMPLE_VIEW, mode)');
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
