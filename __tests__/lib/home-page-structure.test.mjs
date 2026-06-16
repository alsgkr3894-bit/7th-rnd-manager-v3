import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/page.jsx'), 'utf8');
const rowsSource = readFileSync(resolve('components/home/HomeDashboardRows.jsx'), 'utf8');
const rowRendererSource = readFileSync(
  resolve('components/home/home-dashboard-rows/homeDashboardRowRenderer.jsx'),
  'utf8'
);
const rowShellSource = readFileSync(
  resolve('components/home/home-dashboard-rows/HomeDashboardRowShell.jsx'),
  'utf8'
);
const singleRowsSource = readFileSync(
  resolve('components/home/home-dashboard-rows/HomeDashboardSingleRows.jsx'),
  'utf8'
);
const pairRowsSource = readFileSync(
  resolve('components/home/home-dashboard-rows/HomeDashboardPairRows.jsx'),
  'utf8'
);
const greetingSource = readFileSync(resolve('components/home/HomeGreetingBar.jsx'), 'utf8');
const periodSource = readFileSync(resolve('components/home/HomePeriodNav.jsx'), 'utf8');
const quickNoteSource = readFileSync(resolve('components/home/HomeQuickNoteWidget.jsx'), 'utf8');

describe('home page structure', () => {
  test('home page keeps dashboard state and delegates presentation sections', () => {
    expect(pageSource).toContain('<HomeGreetingBar');
    expect(pageSource).toContain('<HomePeriodNav');
    expect(pageSource).toContain('<HomeDashboardRows');
    expect(pageSource).toContain('useHomeDashboardData({ chartTab })');
    expect(pageSource).toContain('saveQuickNote');
    expect(pageSource).not.toContain("case 'recent'");
    expect(pageSource).not.toContain('function pairRow');
    expect(pageSource).not.toContain('<HomeKpiRow');
    expect(pageSource).not.toContain('className="greet"');
    expect(pageSource).not.toContain('className="card quick-note"');
  });

  test('home presentation components own greeting, period, rows, and quick note UI', () => {
    expect(greetingSource).toContain('export function HomeGreetingBar');
    expect(greetingSource).toContain('className="greet"');
    expect(greetingSource).toContain('판매량 업로드');
    expect(periodSource).toContain('export function HomePeriodNav');
    expect(periodSource).toContain('home-period-nav');
    expect(rowsSource).toContain('export function HomeDashboardRows');
    expect(rowsSource).toContain('renderHomeDashboardRow(rowId, context)');
    expect(rowsSource).not.toContain("case 'recent'");
    expect(rowsSource).not.toContain('<HomeQuickNoteWidget');
    expect(rowsSource).not.toContain('WidgetShell');
    expect(rowRendererSource).toContain('const ROW_RENDERERS = {');
    expect(rowRendererSource).toContain('recent: renderRecentRow');
    expect(rowRendererSource).toContain('quicknote: renderQuickNoteRow');
    expect(rowRendererSource).toContain('export function renderHomeDashboardRow');
    expect(rowShellSource).toContain('export function pairDashboardRow');
    expect(rowShellSource).toContain('export function HomeDashboardWidgetFrame');
    expect(rowShellSource).toContain('<WidgetShell');
    expect(singleRowsSource).toContain('export function renderQuickNoteRow');
    expect(singleRowsSource).toContain('<HomeQuickNoteWidget');
    expect(singleRowsSource).toContain('export function renderActivitiesRow');
    expect(pairRowsSource).toContain('export function renderTodoPairRow');
    expect(pairRowsSource).toContain('export function renderRanksRow');
    expect(pairRowsSource).toContain('pairDashboardRow');
    expect(quickNoteSource).toContain('export function HomeQuickNoteWidget');
    expect(quickNoteSource).toContain('className="card quick-note"');
    expect(quickNoteSource).toContain('끝난 테스트 한 줄 메모를 입력하세요');
  });
});
