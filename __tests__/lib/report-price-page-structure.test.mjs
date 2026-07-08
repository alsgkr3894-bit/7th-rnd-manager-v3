import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/report/price/page.jsx'), 'utf8');
const optionsSource = readFileSync(
  resolve('components/report/price/PriceReportOptions.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/report/price/PriceReportPreview.jsx'),
  'utf8'
);

describe('price report page structure', () => {
  test('page delegates option and preview rendering to focused components', () => {
    expect(pageSource).toContain('<PriceReportOptions');
    expect(pageSource).toContain('<PriceReportPreview');
    expect(pageSource).toContain('buildPriceReportData');
    expect(pageSource).toContain('exportPriceReportXlsx');
    expect(pageSource).toContain('onExcelExport={handleExcelExport}');
    expect(pageSource).not.toContain('<OptGroup');
    expect(pageSource).not.toContain('<Seg');
    expect(pageSource).not.toContain('<Check');
    expect(pageSource).not.toContain('paper-stat-row');
    expect(pageSource).not.toContain('paper-table');

    expect(optionsSource).toContain('export function PriceReportOptions');
    expect(optionsSource).toContain('<OptGroup');
    expect(optionsSource).toContain('<Seg');
    expect(optionsSource).toContain('<Check');
    expect(optionsSource).toContain('원가 영향 메뉴 수');
    expect(optionsSource).toContain('Excel (.xlsx)');
    expect(optionsSource).toContain("onFormatChange('excel', value)");

    expect(previewSource).toContain('export function PriceReportPreview');
    expect(previewSource).toContain('paper-stat-row');
    expect(previewSource).toContain('paper-table');
    expect(previewSource).toContain('formatNumber');
    expect(previewSource).toContain('useReportGeneratedMeta');
    expect(previewSource).toContain('compactDateLabel');
    expect(previewSource).toContain('profileName');
    expect(previewSource).not.toContain('getProfile');
  });
});
