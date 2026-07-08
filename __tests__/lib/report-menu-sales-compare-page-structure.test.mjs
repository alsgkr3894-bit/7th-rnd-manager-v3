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
  test('legacy compare route redirects into sales report compare mode', () => {
    expect(pageSource).toContain("import { redirect } from 'next/navigation'");
    expect(pageSource).toContain('buildSalesCompareHref');
    expect(pageSource).toContain("params.set('view', 'compare')");
    expect(pageSource).toContain("params.set('year', params.get('yearA'))");
    expect(pageSource).toContain("params.set('cmpYear', params.get('yearB'))");
    expect(pageSource).toContain('redirect(buildSalesCompareHref(searchParams))');
    expect(pageSource).toContain('/report/sales?');
    expect(pageSource).not.toContain("'use client'");
    expect(pageSource).not.toContain('useEffect');
    expect(pageSource).not.toContain('useRouter');
    expect(pageSource).not.toContain('비교 모드를 여는 중입니다');
    expect(pageSource).not.toContain('<OptGroup');
    expect(pageSource).not.toContain('<Seg');
    expect(pageSource).not.toContain('<Check');
    expect(pageSource).not.toContain('paper-head');
    expect(pageSource).not.toContain('paper-table');
  });

  test('legacy compare controls and preview components remain reusable', () => {
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
    expect(previewSource).toContain('useReportGeneratedMeta');
    expect(previewSource).toContain('compactDateLabel');
    expect(previewSource).toContain('profileName');
    expect(previewSource).not.toContain('getProfile');
  });
});
