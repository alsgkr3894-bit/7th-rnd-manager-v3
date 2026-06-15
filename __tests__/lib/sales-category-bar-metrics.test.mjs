import { buildSalesCategoryBarMetrics } from '@/components/report/sales/salesCategoryBarMetrics';

describe('sales category bar metrics', () => {
  test('수량, 비율, opacity, 상단 행 여부를 계산한다', () => {
    const metrics = buildSalesCategoryBarMetrics({
      item: { quantity: 25 },
      index: 1,
      itemCount: 5,
      catTotal: 100,
    });

    expect(metrics.quantity).toBe(25);
    expect(metrics.pct).toBe(25);
    expect(metrics.dotOpacity).toBeCloseTo(0.9);
    expect(metrics.barOpacity).toBeCloseTo(0.91);
    expect(metrics.isTop).toBe(false);
  });

  test('합계가 없으면 비율은 0으로 고정하고 첫 행을 강조한다', () => {
    const metrics = buildSalesCategoryBarMetrics({
      item: { quantity: '12' },
      index: 0,
      itemCount: 0,
      catTotal: 0,
    });

    expect(metrics.quantity).toBe(12);
    expect(metrics.pct).toBe(0);
    expect(metrics.dotOpacity).toBe(1);
    expect(metrics.barOpacity).toBe(1);
    expect(metrics.isTop).toBe(true);
  });
});
