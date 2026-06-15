import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/note/sample/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/note/sample/_SamplePageActions.jsx'), 'utf8');
const filtersSource = readFileSync(resolve('app/note/sample/_SampleFilterControls.jsx'), 'utf8');
const calendarSource = readFileSync(resolve('app/note/sample/_SampleCalendarView.jsx'), 'utf8');
const recordsSource = readFileSync(resolve('app/note/sample/_SampleRecordsView.jsx'), 'utf8');

describe('sample page structure', () => {
  test('sample page delegates major rendering sections to focused components', () => {
    expect(pageSource).toContain("import { SamplePageActions } from './_SamplePageActions'");
    expect(pageSource).toContain("import { SampleFilterControls } from './_SampleFilterControls'");
    expect(pageSource).toContain("import { SampleCalendarView } from './_SampleCalendarView'");
    expect(pageSource).toContain("import { SampleRecordsView } from './_SampleRecordsView'");
    expect(pageSource).toContain('<SamplePageActions');
    expect(pageSource).toContain('<SampleFilterControls');
    expect(pageSource).toContain('<SampleCalendarView');
    expect(pageSource).toContain('<SampleRecordsView');
    expect(pageSource).not.toContain('downloadCsv');
    expect(pageSource).not.toContain('printCurrentPageWithDownloadDate');
    expect(pageSource).not.toContain('SampleCardSkeleton');
    expect(pageSource).not.toContain('<SampleCard');
    expect(pageSource).not.toContain('<SampleListRow');
    expect(pageSource).not.toContain('className="sample-filter-row"');
    expect(pageSource).not.toContain('className="cal-grid"');
    expect(pageSource).not.toContain('첫 샘플 작성하기');
    expect(pageSource).not.toContain('엑셀로 내보내기');
  });

  test('extracted components own their sample page rendering responsibilities', () => {
    expect(actionsSource).toContain('export function SamplePageActions');
    expect(actionsSource).toContain('downloadCsv');
    expect(actionsSource).toContain('printCurrentPageWithDownloadDate');
    expect(actionsSource).toContain('엑셀로 내보내기');
    expect(filtersSource).toContain('export function SampleFilterControls');
    expect(filtersSource).toContain('className="sample-filter-row"');
    expect(filtersSource).toContain('제목, 메뉴명, 내용, 태그 검색');
    expect(calendarSource).toContain('export function SampleCalendarView');
    expect(calendarSource).toContain('className="cal-grid"');
    expect(calendarSource).toContain('RATING_COLOR');
    expect(recordsSource).toContain('export function SampleRecordsView');
    expect(recordsSource).toContain('SampleCardSkeleton');
    expect(recordsSource).toContain('<SampleCard');
    expect(recordsSource).toContain('<SampleListRow');
    expect(recordsSource).toContain('첫 샘플 작성하기');
    expect(recordsSource).toContain('className="data-table"');
  });
});
