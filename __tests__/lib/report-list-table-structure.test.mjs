import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildReportListRowModel,
  buildReportPaginationItems,
} from '../../components/report/report-list-table/reportListTableUtils.js';

const tableSource = readFileSync(resolve('components/report/ReportListTable.jsx'), 'utf8');
const pageSource = readFileSync(resolve('app/report/page.jsx'), 'utf8');
const reportActionsHookSource = readFileSync(resolve('hooks/useReportActions.js'), 'utf8');
const headerSource = readFileSync(
  resolve('components/report/report-list-table/ReportListTableHeader.jsx'),
  'utf8'
);
const rowSource = readFileSync(
  resolve('components/report/report-list-table/ReportListRow.jsx'),
  'utf8'
);
const nameCellSource = readFileSync(
  resolve('components/report/report-list-table/ReportNameCell.jsx'),
  'utf8'
);
const activitySource = readFileSync(
  resolve('components/report/report-list-table/ReportActivityCell.jsx'),
  'utf8'
);
const actionsSource = readFileSync(
  resolve('components/report/report-list-table/ReportRowActions.jsx'),
  'utf8'
);
const emptySource = readFileSync(
  resolve('components/report/report-list-table/ReportListEmptyState.jsx'),
  'utf8'
);
const paginationSource = readFileSync(
  resolve('components/report/report-list-table/ReportListPagination.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/report/report-list-table/reportListTableUtils.js'),
  'utf8'
);

describe('report list table helpers', () => {
  test('row model keeps display labels, fallbacks, and row state flags stable', () => {
    const report = {
      id: 7,
      name: '',
      kind: 'missing-kind',
      createdAt: 'bad-date',
      period: '',
      author: '',
      views: '12',
      links: 2,
    };
    const model = buildReportListRowModel(report, {
      deletingId: 7,
      editingId: 7,
      newIds: new Set([7]),
    });

    expect(model).toMatchObject({
      kind: 'missing-kind',
      reportName: '이름 없는 보고서',
      reportId: '7',
      rowKey: '7',
      displayId: 'RPT-0007',
      createdLabel: '—',
      periodLabel: '—',
      authorLabel: '—',
      views: 12,
      links: 2,
      isDeleting: true,
      isNew: true,
      isEditing: true,
    });
    expect(model.chip.label).toBe('판매량');
  });

  test('pagination helper inserts ellipses around the active page window', () => {
    expect(buildReportPaginationItems(10, 5)).toEqual([1, '…', 4, 5, 6, '…', 10]);
    expect(buildReportPaginationItems(3, 1)).toEqual([1, 2, 3]);
  });
});

describe('report list table structure', () => {
  test('ReportListTable delegates header, rows, empty state, and pagination', () => {
    expect(tableSource).toContain('export function ReportListTable');
    expect(tableSource).toContain('<ReportListTableHeader');
    expect(tableSource).toContain('<ReportListRow');
    expect(tableSource).toContain('<ReportListEmptyState');
    expect(tableSource).toContain('<ReportListPagination');
    expect(tableSource).toContain('buildReportListRowModel(report');
    expect(tableSource).not.toContain('SortableTh');
    expect(tableSource).not.toContain('showToast');
    expect(tableSource).not.toContain('KIND_CHIP');
    expect(tableSource).not.toContain('report-activity');
    expect(tableSource).not.toContain('report-name-btn');
    expect(tableSource).not.toContain('empty-state');
    expect(tableSource).not.toContain('report-pagination');
  });

  test('split report list table components own their rendering details', () => {
    expect(headerSource).toContain('export function ReportListTableHeader');
    expect(headerSource).toContain('<SortableTh');
    expect(rowSource).toContain('export function ReportListRow');
    expect(rowSource).toContain('<ReportNameCell');
    expect(rowSource).toContain('<ReportActivityCell');
    expect(rowSource).toContain('<ReportRowActions');
    expect(rowSource).toContain('즐겨찾기 해제');
    expect(rowSource).toContain('disabled={!canEdit}');
    expect(nameCellSource).toContain('export function ReportNameCell');
    expect(nameCellSource).toContain('canEdit = false');
    expect(nameCellSource).toContain('disabled={!canEdit}');
    expect(nameCellSource).toContain('showToast');
    expect(nameCellSource).toContain('commitEdit(report)');
    expect(nameCellSource).toContain('report-name-btn');
    expect(activitySource).toContain('export function ReportActivityCell');
    expect(activitySource).toContain('report-activity');
    expect(activitySource).toContain('활성 공유 링크');
    expect(actionsSource).toContain('export function ReportRowActions');
    expect(actionsSource).toContain('setPreviewPrintOnOpen(true)');
    expect(actionsSource).toContain('Icon.download');
    expect(actionsSource).toContain('handleDelete(report.id)');
    expect(emptySource).toContain('export function ReportListEmptyState');
    expect(emptySource).toContain('보고서가 없어요');
    expect(emptySource).toContain('새 보고서 생성');
    expect(paginationSource).toContain('export function ReportListPagination');
    expect(paginationSource).toContain('buildReportPaginationItems(totalPages, safePage)');
    expect(utilsSource).toContain('export function buildReportListRowModel');
    expect(utilsSource).toContain('export function buildReportPaginationItems');
    expect(utilsSource).toContain('KIND_CHIP[kind] || KIND_CHIP.sales');
  });

  test('destructive report controls follow current role state', () => {
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(pageSource).toContain('useReportActions({ reload, canEdit })');
    expect(pageSource).toContain('disabled={!canEdit}');
    expect(tableSource).toContain('canEdit = false');
    expect(tableSource).toContain('canEdit={canEdit}');
    expect(rowSource).toContain('canEdit = false');
    expect(rowSource).toContain('canEdit={canEdit}');
    expect(rowSource).toContain('if (canEdit) handleToggleFav');
    expect(nameCellSource).toContain('if (canEdit) startEdit(report)');
    expect(actionsSource).toContain('canEdit = false');
    expect(actionsSource).toContain('disabled={isDeleting || !canEdit}');
    expect(reportActionsHookSource).toContain('canEdit = false');
    expect(reportActionsHookSource).toContain('if (!canEdit) return');
  });
});
