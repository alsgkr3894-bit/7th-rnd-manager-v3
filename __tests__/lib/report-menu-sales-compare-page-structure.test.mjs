import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/report/menu-sales-compare/page.jsx'), 'utf8');
const optionsSource = readFileSync(
  resolve('components/report/compare/MenuSalesCompareOptions.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/report/compare/MenuSalesComparePreview.jsx'),
  'utf8'
);

describe('menu sales compare report page structure', () => {
  test('page delegates report controls and preview rendering', () => {
    expect(pageSource).toContain('<MenuSalesCompareOptions');
    expect(pageSource).toContain('<MenuSalesComparePreview');
    expect(pageSource).toContain('buildPeriodCompare');
    expect(pageSource).toContain('buildCompareSeries');
    expect(pageSource).toContain('availablePeriods');
    expect(pageSource).toContain('autoPeriodReadyRef');
    expect(pageSource).not.toContain('<OptGroup');
    expect(pageSource).not.toContain('<Seg');
    expect(pageSource).not.toContain('<Check');
    expect(pageSource).not.toContain('paper-head');
    expect(pageSource).not.toContain('paper-table');

    expect(optionsSource).toContain('export function MenuSalesCompareOptions');
    expect(optionsSource).toContain('<OptGroup');
    expect(optionsSource).toContain('<Seg');
    expect(optionsSource).toContain('<Check');
    expect(optionsSource).toContain("value: '피자'");
    expect(optionsSource).toContain("value: '사이드'");
    expect(optionsSource).toContain('Winners & Losers 부록');

    expect(previewSource).toContain('export function MenuSalesComparePreview');
    expect(previewSource).toContain('paper-head');
    expect(previewSource).toContain('paper-table');
    expect(previewSource).toContain('<AreaChart');
    expect(previewSource).toContain('getProfile');
  });
});
