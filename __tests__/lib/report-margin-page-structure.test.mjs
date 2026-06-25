import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KIND_META } from '../../lib/report/constants.js';

const pageSource = readFileSync(resolve('app/report/margin/page.jsx'), 'utf8');
const optionsSource = readFileSync(
  resolve('components/report/margin/MarginReportOptions.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/report/margin/MarginReportPreview.jsx'),
  'utf8'
);
const helperSource = readFileSync(resolve('lib/cost/margin/report-options.js'), 'utf8');
const filterToolbarSource = readFileSync(
  resolve('components/report/ReportFilterToolbar.jsx'),
  'utf8'
);

describe('margin report page structure', () => {
  test('보고서센터에 원가마진표 보고서 종류를 노출한다', () => {
    expect(KIND_META.margin).toMatchObject({
      id: 'margin',
      title: '원가마진표 보고서',
      href: '/report/margin',
    });
    expect(filterToolbarSource).toContain("{ id: 'margin', label: '마진표' }");
  });

  test('원가마진표 보고서는 기존 마진표 데이터와 export 함수를 재사용한다', () => {
    expect(pageSource).toContain('ReportBuilderShell');
    expect(pageSource).toContain('<MarginReportOptions');
    expect(pageSource).toContain('<MarginReportPreview');
    expect(pageSource).toContain('useMarginData');
    expect(pageSource).toContain('filterMarginReportRows');
    expect(pageSource).toContain('exportMarginExcel');
    expect(pageSource).toContain('kind="margin"');
    expect(pageSource).toContain('중분류 컬럼은 제외');
  });

  test('옵션 패널은 카테고리·엣지·사이즈·문서 형식을 제공한다', () => {
    expect(optionsSource).toContain('카테고리 항목별 출력');
    expect(optionsSource).toContain('엣지별 출력');
    expect(optionsSource).toContain('사이즈별 출력');
    expect(optionsSource).toContain('플랫폼 · 할인');
    expect(optionsSource).toContain('Excel (.xlsx)');
  });

  test('미리보기는 출력용 엑셀 행 빌더와 카테고리 섹션을 사용한다', () => {
    expect(previewSource).toContain('buildMarginExcelRows');
    expect(previewSource).toContain('paper-head');
    expect(previewSource).toContain('paper-stat-row');
    expect(previewSource).toContain('paper-cat-section');
    expect(previewSource).toContain('원가마진표 보고서');
  });

  test('필터 helper는 base edge와 L/R/단일 사이즈 그룹을 지원한다', () => {
    expect(helperSource).toContain("export const BASE_EDGE_KEY = 'base'");
    expect(helperSource).toContain("export const SINGLE_SIZE_GROUP = '단일'");
    expect(helperSource).toContain('export function filterMarginReportRows');
    expect(helperSource).toContain('export function collectMarginReportSizeOptions');
    expect(helperSource).toContain('normalizeMarginSizeGroup');
  });
});
