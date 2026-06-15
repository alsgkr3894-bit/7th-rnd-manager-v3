import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('sales report preview structure', () => {
  test('판매량 보고서 page는 미리보기 렌더링을 전용 컴포넌트에 위임한다', () => {
    const pageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
    const previewSource = readFileSync(
      resolve('components/report/sales/SalesReportPreview.jsx'),
      'utf8'
    );
    const moverSource = readFileSync(
      resolve('components/report/sales/SalesPizzaMoverSection.jsx'),
      'utf8'
    );
    const rankSource = readFileSync(
      resolve('components/report/sales/SalesRankTableSection.jsx'),
      'utf8'
    );
    const compareSource = readFileSync(
      resolve('components/report/sales/SalesCompareTableSection.jsx'),
      'utf8'
    );
    const excludedSource = readFileSync(
      resolve('components/report/sales/SalesExcludedListSection.jsx'),
      'utf8'
    );

    expect(pageSource).toContain(
      "SalesReportPreview from '@/components/report/sales/SalesReportPreview'"
    );
    expect(pageSource).toContain('<SalesReportPreview');
    expect(pageSource).not.toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain("from './SalesPizzaMoverSection'");
    expect(previewSource).toContain("from './SalesRankTableSection'");
    expect(previewSource).toContain("from './SalesCompareTableSection'");
    expect(previewSource).toContain("from './SalesExcludedListSection'");
    expect(previewSource).toContain('<SalesPizzaMoverSection');
    expect(previewSource).toContain('<SalesRankTableSection');
    expect(previewSource).toContain('<SalesCompareTableSection');
    expect(previewSource).toContain('<SalesExcludedListSection');
    expect(previewSource).not.toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain("scope === 'all' ? '전체 메뉴'");
    expect(previewSource).not.toContain("safeScope === 'pizza' ? '피자' : '사이드'");
    expect(moverSource).toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(rankSource).toContain('export function SalesRankTableSection');
    expect(compareSource).toContain('export function SalesCompareTableSection');
    expect(excludedSource).toContain('export function SalesExcludedListSection');
  });
});
