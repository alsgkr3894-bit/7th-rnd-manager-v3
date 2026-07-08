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
    const categoryBarSource = readFileSync(
      resolve('components/report/sales/SalesCategoryBarRows.jsx'),
      'utf8'
    );
    const categoryBarRowSource = readFileSync(
      resolve('components/report/sales/SalesCategoryBarRow.jsx'),
      'utf8'
    );
    const categoryBarMetricsSource = readFileSync(
      resolve('components/report/sales/salesCategoryBarMetrics.js'),
      'utf8'
    );
    const rankTableSource = readFileSync(
      resolve('components/report/sales/SalesRankTable.jsx'),
      'utf8'
    );
    const rankTableRowsSource = readFileSync(
      resolve('components/report/sales/SalesRankTableRows.jsx'),
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
    expect(pageSource).toContain('readSalesReportQuery');
    expect(pageSource).toContain('new URLSearchParams(window.location.search)');
    expect(pageSource).toContain("params.get('year')");
    expect(pageSource).toContain("params.get('view')");
    expect(pageSource).toContain("params.get('cmpYear')");
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
    expect(rankSource).toContain("from './SalesCategoryBarRows'");
    expect(rankSource).toContain("from './SalesRankTable'");
    expect(rankSource).toContain('<SalesRankTable');
    expect(rankSource).toContain('<SalesCategoryBarRows');
    expect(rankSource).not.toContain("from './SalesRankTableRows'");
    expect(rankSource).not.toContain('function SalesVariantRows');
    expect(rankSource).not.toContain('className="paper-table"');
    expect(categoryBarSource).toContain('export function SalesCategoryBarRows');
    expect(categoryBarSource).toContain("from './SalesCategoryBarRow'");
    expect(categoryBarSource).toContain('<SalesCategoryBarRow');
    expect(categoryBarSource).not.toContain('pct.toFixed(1)');
    expect(categoryBarRowSource).toContain("from './salesCategoryBarMetrics'");
    expect(categoryBarRowSource).toContain('export function SalesCategoryBarRow');
    expect(categoryBarRowSource).not.toContain('safeQuantity(item.quantity)');
    expect(categoryBarRowSource).toContain('pct.toFixed(1)');
    expect(categoryBarRowSource).toContain('formatNumber(quantity)');
    expect(categoryBarMetricsSource).toContain('export function buildSalesCategoryBarMetrics');
    expect(categoryBarMetricsSource).toContain('safeQuantity(item.quantity)');
    expect(categoryBarMetricsSource).toContain('dotOpacity');
    expect(categoryBarMetricsSource).toContain('barOpacity');
    expect(categoryBarSource).not.toContain('export function SalesRankTable');
    expect(rankTableSource).toContain('export function SalesRankTable');
    expect(rankTableSource).toContain("from './SalesRankTableRows'");
    expect(rankTableSource).toContain('<SalesRankItemRows');
    expect(rankTableSource).toContain('className="paper-table"');
    expect(rankTableSource).not.toContain('export function SalesCategoryBarRows');
    expect(rankTableSource).not.toContain('function SalesVariantRows');
    expect(rankTableSource).not.toContain('function SalesRankDeltaCell');
    expect(rankTableRowsSource).toContain('export function SalesVariantRows');
    expect(rankTableRowsSource).toContain('export function SalesRankDeltaCell');
    expect(rankTableRowsSource).toContain('export function SalesRankItemRows');
    expect(rankTableRowsSource).toContain('safeQuantity(item.prevQty)');
    expect(compareSource).toContain('export function SalesCompareTableSection');
    expect(excludedSource).toContain('export function SalesExcludedListSection');
  });
});
