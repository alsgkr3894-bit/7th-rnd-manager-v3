import {
  onManagedProductsChange,
  emitManagedProductsChange,
} from '../../lib/shipment/products-events.js';

describe('managed products 변경 이벤트 허브', () => {
  test('구독자는 emit 시 통지를 받는다', () => {
    let count = 0;
    const off = onManagedProductsChange(() => { count += 1; });
    emitManagedProductsChange();
    emitManagedProductsChange();
    expect(count).toBe(2);
    off();
  });

  test('구독 해제 후에는 통지를 받지 않는다', () => {
    let count = 0;
    const off = onManagedProductsChange(() => { count += 1; });
    emitManagedProductsChange();
    off();
    emitManagedProductsChange();
    expect(count).toBe(1);
  });

  test('한 구독자가 throw해도 다른 구독자는 통지를 받는다', () => {
    let ok = 0;
    const offBad  = onManagedProductsChange(() => { throw new Error('boom'); });
    const offGood = onManagedProductsChange(() => { ok += 1; });
    expect(() => emitManagedProductsChange()).not.toThrow();
    expect(ok).toBe(1);
    offBad(); offGood();
  });

  test('함수가 아닌 인자는 무시되고 no-op 해제자를 반환한다', () => {
    const off = onManagedProductsChange(null);
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
});
