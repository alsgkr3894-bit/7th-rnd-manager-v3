import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageModalSource = readFileSync(
  resolve('components/report/MonthlyClosePackageModal.jsx'),
  'utf8'
);
const salesPageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
const shipmentPageSource = readFileSync(resolve('app/report/shipment/page.jsx'), 'utf8');
const reportKindGridSource = readFileSync(resolve('components/report/ReportKindGrid.jsx'), 'utf8');
const newReportModalSource = readFileSync(resolve('components/report/NewReportModal.jsx'), 'utf8');
const filterToolbarSource = readFileSync(
  resolve('components/report/ReportFilterToolbar.jsx'),
  'utf8'
);
const constantsSource = readFileSync(resolve('lib/report/constants.js'), 'utf8');

describe('monthly close and merged report routing', () => {
  test('월마감 패키지는 선택 월의 전월을 보고서 링크로 넘긴다', () => {
    expect(packageModalSource).toContain('getMonthlyCloseTargetPeriod');
    expect(packageModalSource).toContain(
      'checkPeriodDataAvailability({ year: targetYear, month: targetMonth })'
    );
    expect(packageModalSource).toContain(
      'buildPackageItemHref(navItem, { year: targetYear, month: targetMonth })'
    );
    expect(packageModalSource).toContain('집계 대상:');
    expect(packageModalSource).toContain('자동 합계');
  });

  test('판매량·출고량 보고서는 월마감 링크의 year/month를 수용한다', () => {
    expect(salesPageSource).toContain('readSalesReportQuery');
    expect(salesPageSource).toContain("params.get('year')");
    expect(salesPageSource).toContain("params.get('month')");
    expect(salesPageSource).toContain("params.get('cmpYear')");
    expect(shipmentPageSource).toContain('readShipmentReportQuery');
    expect(shipmentPageSource).toContain("params.get('year')");
    expect(shipmentPageSource).toContain("params.get('month')");
  });

  test('판매량 비교 보고서는 새 생성 목록에서 판매량 보고서로 통합된다', () => {
    expect(constantsSource).toContain("mergedInto: 'sales'");
    expect(constantsSource).toContain('hideInLauncher: true');
    expect(constantsSource).toContain("mergedInto: 'cost'");
    expect(reportKindGridSource).toContain('REPORT_LAUNCHER_KINDS');
    expect(newReportModalSource).toContain('REPORT_LAUNCHER_KINDS');
    expect(filterToolbarSource).not.toContain("{ id: 'compare', label: '비교' }");
    expect(filterToolbarSource).not.toContain("{ id: 'margin', label: '마진표' }");
  });
});
