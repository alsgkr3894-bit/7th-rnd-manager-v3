import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve('app/menu-sales/rank-compare/page.jsx'), 'utf8');
const periodBarSource = readFileSync(resolve('components/sales/PeriodBar.jsx'), 'utf8');
const singleMonthSource = readFileSync(resolve('components/sales/SingleMonthView.jsx'), 'utf8');

describe('sales rank compare page structure', () => {
  test('period selector highlights the selected month in compact year-month format', () => {
    expect(periodBarSource).toContain('period-selected-month');
    expect(periodBarSource).toContain('선택한 월');
    expect(periodBarSource).toContain('formatPeriodCompact');
    expect(periodBarSource).toContain("padStart(2, '0')");
  });

  test('single month view keeps sales and revenue KPIs without average cost rate', () => {
    expect(pageSource).not.toContain('useAvgCostRate');
    expect(pageSource).not.toContain('avgCostRate=');
    expect(singleMonthSource).toContain('총 매출액');
    expect(singleMonthSource).toContain('safeRevenue(safeDetail?.revenueTotal)');
    expect(singleMonthSource).not.toContain('평균 원가율');
    expect(singleMonthSource).not.toContain('costRateColor');
  });
});
