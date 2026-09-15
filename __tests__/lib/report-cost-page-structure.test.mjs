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
const recipePrintSource = readFileSync(
  resolve('components/report/cost/RecipePrintView.jsx'),
  'utf8'
);
const recipeOptionsSource = readFileSync(
  resolve('components/report/cost/CostRecipeOptions.jsx'),
  'utf8'
);

describe('cost report page structure', () => {
  test('page delegates option controls and preview composition', () => {
    expect(pageSource).toContain('<CostReportOptions');
    expect(pageSource).toContain('<CostReportPreview');
    expect(pageSource).toContain('<ReportModeSwitch value="cost"');
    expect(pageSource).toContain('<MarginReportBuilderContent');
    expect(pageSource).toContain('readReportModeFromLocation');
    expect(pageSource).toContain('useSettingValue');
    expect(pageSource).toContain('buildStrictPostingMessage(strictPostingIssues)');
    expect(pageSource).toContain('exportCostXlsx');
    expect(pageSource).not.toContain('<OptGroup');
    expect(pageSource).not.toContain('<Check');
    expect(pageSource).not.toContain('threshold-bar');
    expect(pageSource).not.toContain('paper-head');
    // 레시피 부록을 켜면 report 탭으로 되돌려, "보고서 생성"이 부록 없이 다른 탭 내용만
    // 찍는 함정을 막는다.
    expect(pageSource).toContain("key === 'recipeAppendix' && value === true");
    expect(pageSource).toContain("setViewTab('report')");
    expect(pageSource).toContain('onOptionChange={handleOptionChange}');

    expect(optionsSource).toContain('export function CostReportOptions');
    expect(optionsSource).toContain('<OptGroup');
    expect(optionsSource).toContain('<Check');
    expect(optionsSource).toContain('threshold-bar');
    expect(optionsSource).toContain('<CostRecipeOptions');

    expect(recipeOptionsSource).toContain('export function CostRecipeOptions');
    expect(recipeOptionsSource).toContain('<details');
    expect(recipeOptionsSource).toContain('전체 선택');
    expect(recipeOptionsSource).toContain('피자 메뉴당 1페이지');

    expect(recipePrintSource).toContain('export function RecipePrintView');
    expect(recipePrintSource).toContain('<RecipeCategorySection');
    expect(recipePrintSource).not.toContain('CATEGORY_COLORS');

    expect(previewSource).toContain('export function CostReportPreview');
    expect(previewSource).toContain('paper-head');
    expect(previewSource).toContain('<CostReportView');
    expect(previewSource).toContain('<CostTableView');
    expect(previewSource).toContain('<RecipePrintView');
    expect(previewSource).toContain('recipe-print-appendix');
    expect(previewSource).toContain('hideOverview');
    // 선택된 레시피가 없으면(카테고리/메뉴 전부 해제) 빈 부록 페이지를 강제로 넣지 않는다.
    expect(previewSource).toContain('opts.recipeAppendix && recipeSections.length > 0');

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
