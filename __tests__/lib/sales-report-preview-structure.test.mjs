import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('sales report preview structure', () => {
  test('판매량 보고서 page는 미리보기 렌더링을 전용 컴포넌트에 위임한다', () => {
    const pageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
    const previewSource = readFileSync(
      resolve('components/report/sales/SalesReportPreview.jsx'),
      'utf8'
    );

    expect(pageSource).toContain(
      "SalesReportPreview from '@/components/report/sales/SalesReportPreview'"
    );
    expect(pageSource).toContain('<SalesReportPreview');
    expect(pageSource).not.toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain("scope === 'all' ? '전체 메뉴'");
    expect(previewSource).not.toContain("safeScope === 'pizza' ? '피자' : '사이드'");
  });
});
