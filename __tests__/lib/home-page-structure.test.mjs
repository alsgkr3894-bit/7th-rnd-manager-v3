import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/page.jsx'), 'utf8');
const appShellSource = readFileSync(resolve('components/AppShell.jsx'), 'utf8');
const paletteSource = readFileSync(resolve('components/CommandPalette.jsx'), 'utf8');
const keyboardShortcutsSource = readFileSync(resolve('hooks/useKeyboardShortcuts.js'), 'utf8');
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
const actionCenterSource = readFileSync(resolve('components/home/ActionCenterWidget.jsx'), 'utf8');
const dataFreshnessSource = readFileSync(
  resolve('components/home/DataFreshnessWidget.jsx'),
  'utf8'
);
const chartRowSource = readFileSync(resolve('components/home/HomeChartRow.jsx'), 'utf8');
const activitiesSource = readFileSync(resolve('components/home/HomeActivities.jsx'), 'utf8');
const moduleHealthSource = readFileSync(resolve('components/home/ModuleHealthWidget.jsx'), 'utf8');
const shortcutsHelpSource = readFileSync(resolve('components/ShortcutsHelp.jsx'), 'utf8');
const sidebarSource = readFileSync(resolve('components/Sidebar.jsx'), 'utf8');
const menuSalesPageSource = readFileSync(resolve('app/menu-sales/page.jsx'), 'utf8');
const rankComparePageSource = readFileSync(resolve('app/menu-sales/rank-compare/page.jsx'), 'utf8');
const rankCompareEmptySource = readFileSync(
  resolve('components/sales/RankCompareEmpty.jsx'),
  'utf8'
);

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

  test('home/topbar/palette quick write entry points follow canEdit', () => {
    expect(appShellSource).toContain("from '@/hooks/useCurrentRole'");
    expect(appShellSource).toContain('const canEdit = roleReady && isAdmin');
    expect(appShellSource).toContain('canEdit={canEdit}');
    expect(appShellSource).toContain('<CommandPalette open={paletteOpen}');

    expect(paletteSource).toContain('canEdit = false');
    expect(paletteSource).toContain('usePaletteItems(open, { canEdit })');
    expect(paletteSource).toContain('isPaletteItemVisibleForRole(item, canEdit)');

    expect(keyboardShortcutsSource).toContain('canEdit = false');
    expect(keyboardShortcutsSource).toContain("if (canEdit) router.push('/note/write')");

    expect(appShellSource).toContain('<Sidebar');
    expect(appShellSource).toContain('<ShortcutsHelp');
    expect(sidebarSource).toContain('filterNavSectionsForRole(NAV_SECTIONS, canEdit)');
    expect(shortcutsHelpSource).toContain('visibleShortcuts');
    expect(shortcutsHelpSource).toContain('requiresEdit: true');
  });

  test('home quick note and hero write buttons are disabled for viewer', () => {
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(pageSource).toContain('노트 작성은 관리자만 가능합니다');
    expect(pageSource).toContain('canEdit={canEdit}');

    expect(greetingSource).toContain('canEdit = false');
    expect(greetingSource).toContain('disabled={!canEdit}');

    expect(singleRowsSource).toContain('canEdit={context.canEdit}');
    expect(quickNoteSource).toContain('canEdit = false');
    expect(quickNoteSource).toContain('disabled={!canEdit}');
    expect(quickNoteSource).toContain('disabled={!canEdit || !quickNote.trim()}');
  });

  test('home dashboard upload entry points are role-aware', () => {
    expect(pageSource).toContain('<ActionCenterWidget');
    expect(pageSource).toContain('canEdit={canEdit}');
    expect(actionCenterSource).toContain('canEdit = false');
    expect(actionCenterSource).toContain('canEdit,');

    expect(singleRowsSource).toContain('canEdit={context.canEdit}');
    expect(dataFreshnessSource).toContain('getRoleSafeHref(row.href, canEdit)');
    expect(chartRowSource).toContain("action={canEdit ? '판매량 업로드' : undefined}");
    expect(activitiesSource).toContain('getRoleSafeHref(activityHref(type), canEdit)');
    expect(moduleHealthSource).toContain('canEdit,');
  });

  test('sales hub and empty upload CTA follow current role', () => {
    expect(menuSalesPageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(menuSalesPageSource).toContain(
      'filterRoleVisibleGroups(MENU_SALES_HUB_GROUPS, canEdit)'
    );
    expect(rankComparePageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(rankComparePageSource).toContain('<RankCompareEmpty canEdit={canEdit} />');
    expect(rankCompareEmptySource).toContain('canEdit = false');
    expect(rankCompareEmptySource).toContain('{canEdit && (');
  });
});
