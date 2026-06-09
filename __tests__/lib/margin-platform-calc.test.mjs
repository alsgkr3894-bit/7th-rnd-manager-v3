import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '../../lib/cost/margin/calc.js';

// ─── applyDiscount ───────────────────────────────────────────────────────────

describe('applyDiscount', () => {
  test('pct 할인: 10000원에서 20% 할인 → 8000', () => {
    expect(applyDiscount(10000, { type: 'pct', value: 20 })).toBe(8000);
  });

  test('fixed 할인: 10000원에서 1500원 고정 할인 → 8500', () => {
    expect(applyDiscount(10000, { type: 'fixed', value: 1500 })).toBe(8500);
  });

  test('discount null → 원가 그대로 반환', () => {
    expect(applyDiscount(10000, null)).toBe(10000);
  });

  test('discount value 0 → 원가 그대로 반환', () => {
    expect(applyDiscount(10000, { type: 'pct', value: 0 })).toBe(10000);
  });

  test('판매가 0 → 0 반환', () => {
    expect(applyDiscount(0, { type: 'pct', value: 20 })).toBe(0);
  });

  test('판매가 undefined → 0 반환', () => {
    expect(applyDiscount(undefined, null)).toBe(0);
  });

  test('pct 100% 할인 → 0 (음수 방지)', () => {
    expect(applyDiscount(10000, { type: 'pct', value: 100 })).toBe(0);
  });

  test('fixed 할인이 판매가 초과 → 0 (음수 방지)', () => {
    expect(applyDiscount(5000, { type: 'fixed', value: 9999 })).toBe(0);
  });
});

// ─── calcNetRevenue ───────────────────────────────────────────────────────────

describe('calcNetRevenue', () => {
  test('수수료 없음 → 판매가 그대로', () => {
    expect(calcNetRevenue(10000, [])).toBe(10000);
  });

  test('pct 수수료 10% → 9000', () => {
    expect(calcNetRevenue(10000, [{ type: 'pct', value: 10 }])).toBe(9000);
  });

  test('fixed 수수료 500원 → 9500', () => {
    expect(calcNetRevenue(10000, [{ type: 'fixed', value: 500 }])).toBe(9500);
  });

  test('pct + fixed 복합 수수료', () => {
    // 10% of 10000 = 1000, fixed 500 → 8500
    expect(
      calcNetRevenue(10000, [
        { type: 'pct', value: 10 },
        { type: 'fixed', value: 500 },
      ])
    ).toBe(8500);
  });

  test('sizeLabel sizeOverrides 적용', () => {
    const fee = { type: 'fixed', value: 500, sizeOverrides: { L: 800 } };
    expect(calcNetRevenue(10000, [fee], 'L')).toBe(9200);
  });

  test('sizeLabel 없으면 default value 사용', () => {
    const fee = { type: 'fixed', value: 500, sizeOverrides: { L: 800 } };
    expect(calcNetRevenue(10000, [fee])).toBe(9500);
  });

  test('effectivePrice 0 이하 → 0', () => {
    expect(calcNetRevenue(0, [{ type: 'pct', value: 10 }])).toBe(0);
  });

  test('fees null → 판매가 그대로', () => {
    expect(calcNetRevenue(10000, null)).toBe(10000);
  });

  test('수수료 합이 판매가 초과 → 0 (음수 방지)', () => {
    expect(calcNetRevenue(1000, [{ type: 'fixed', value: 2000 }])).toBe(0);
  });
});

// ─── calcPlatformMargin ───────────────────────────────────────────────────────

describe('calcPlatformMargin', () => {
  test('원가율 30%: 원가 3000, 수령액 10000', () => {
    expect(calcPlatformMargin(3000, 10000)).toBeCloseTo(30, 5);
  });

  test('원가율 50%: 원가 5000, 수령액 10000', () => {
    expect(calcPlatformMargin(5000, 10000)).toBe(50);
  });

  test('원가율 100%: 원가 = 수령액', () => {
    expect(calcPlatformMargin(10000, 10000)).toBe(100);
  });

  test('수령액 0 → null (division by zero 방지)', () => {
    expect(calcPlatformMargin(3000, 0)).toBeNull();
  });

  test('수령액 음수 → null', () => {
    expect(calcPlatformMargin(3000, -1)).toBeNull();
  });

  test('원가 0 → 원가율 0%', () => {
    expect(calcPlatformMargin(0, 10000)).toBe(0);
  });
});
