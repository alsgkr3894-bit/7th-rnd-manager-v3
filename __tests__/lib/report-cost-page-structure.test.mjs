import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/report/cost/page.jsx'), 'utf8');
const optionsSource = readFileSync(resolve('components/report/cost/CostReportOptions.jsx'), 'utf8');
const previewSource = readFileSync(resolve('components/report/cost/CostReportPreview.jsx'), 'utf8');
const costTableSource = readFileSync(resolve('components/report/cost/CostTableView.jsx'), 'utf8');
const reportViewSource = readFileSync(resolve('components/report/cost/CostReportView.jsx'), 'utf8');
const summaryStatsSource = readFileSync(
  resolve('components/report/cost/report-view/CostReportSummaryStats.jsx'),
  'utf8'
);
const categoryComparisonSource = readFileSync(
  resolve('components/report/cost/report-view/CostReportCategoryComparison.jsx'),
  'utf8'
);
const categorySectionsSource = readFileSync(
  resolve('components/report/cost/report-view/CostReportCategorySections.jsx'),
  'utf8'
);
const riskListSource = readFileSync(
  resolve('components/report/cost/report-view/CostReportRiskList.jsx'),
  'utf8'
);
const diagnosticsSource = readFileSync(
  resolve('components/report/cost/report-view/CostReportDiagnostics.jsx'),
  'utf8'
);

describe('cost report page structure', () => {
  test('page delegates option controls and preview composition', () => {
    expect(pageSource).toContain('<CostReportOptions');
    expect(pageSource).toContain('<CostReportPreview');
    expect(pageSource).toContain('useSettingValue');
    expect(pageSource).toContain('buildStrictPostingMessage(strictPostingIssues)');
    expect(pageSource).toContain('exportCostXlsx');
    expect(pageSource).not.toContain('<OptGroup');
    expect(pageSource).not.toContain('<Check');
    expect(pageSource).not.toContain('threshold-bar');
    expect(pageSource).not.toContain('paper-head');

    expect(optionsSource).toContain('export function CostReportOptions');
    expect(optionsSource).toContain('<OptGroup');
    expect(optionsSource).toContain('<Check');
    expect(optionsSource).toContain('threshold-bar');

    expect(previewSource).toContain('export function CostReportPreview');
    expect(previewSource).toContain('paper-head');
    expect(previewSource).toContain('<CostReportView');
    expect(previewSource).toContain('<CostTableView');
    expect(previewSource).toContain('<RecipePrintView');

    expect(costTableSource).toContain('cost-table-menu-row');
    expect(costTableSource).toContain('menuRowStyle');
    expect(costTableSource).toContain('구분');
    expect(costTableSource).toContain('메뉴 {index + 1}');

    expect(reportViewSource).toContain('export function CostReportView');
    expect(reportViewSource).toContain('<CostReportSummaryStats');
    expect(reportViewSource).toContain('<CostReportCategoryComparison');
    expect(reportViewSource).toContain('<CostReportCategorySections');
    expect(reportViewSource).toContain('<CostReportRiskList');
    expect(reportViewSource).toContain('<CostReportDiagnostics');
    expect(reportViewSource).not.toContain('cost-bars');
    expect(reportViewSource).not.toContain('paper-table');

    expect(summaryStatsSource).toContain('export function CostReportSummaryStats');
    expect(summaryStatsSource).toContain('paper-stat-row');
    expect(categoryComparisonSource).toContain('export function CostReportCategoryComparison');
    expect(categoryComparisonSource).toContain('cost-bars');
    expect(categoryComparisonSource).toContain('CategoryComparisonTable');
    expect(categorySectionsSource).toContain('export function CostReportCategorySections');
    expect(categorySectionsSource).toContain('paper-cat-section');
    expect(riskListSource).toContain('export function CostReportRiskList');
    expect(riskListSource).toContain('Icon.alert');
    expect(diagnosticsSource).toContain('export function CostReportDiagnostics');
    expect(diagnosticsSource).toContain('원가 미연결 메뉴');
  });
});
