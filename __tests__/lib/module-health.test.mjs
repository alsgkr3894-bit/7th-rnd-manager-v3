import {
  buildModuleHealth,
  countModuleHealth,
} from '../../lib/stats/module-health.js';

const freshStatus = { year: 2026, month: 5, stale: false, never: false };
const staleStatus = { year: 2026, month: 4, stale: true, never: false };
const neverStatus = { year: null, month: null, stale: true, never: true };

describe('module-health', () => {
  test('모든 핵심 데이터가 정상이고 이슈가 없으면 전체 good 상태다', () => {
    const modules = buildModuleHealth({
      freshness: { sales: freshStatus, price: freshStatus, shipment: freshStatus },
      backupReminder: { stale: false, daysSince: 3, never: false },
      issues: [],
      costAlertData: { items: [{ costRate: 28 }] },
      todos: [],
      pipeline: { columns: [{ count: 2 }] },
      isMain: true,
    });

    expect(modules.map(item => item.status)).toEqual(['good', 'good', 'good', 'good', 'good']);
    expect(countModuleHealth(modules)).toEqual({ good: 5, warn: 0, bad: 0 });
  });

  test('판매량 이력 없음은 bad, 미매칭만 있으면 warn으로 판단한다', () => {
    const neverSales = buildModuleHealth({
      freshness: { sales: neverStatus, price: freshStatus, shipment: freshStatus },
      backupReminder: { stale: false, daysSince: 3, never: false },
      issues: [],
      costAlertData: { items: [] },
      todos: [],
      isMain: true,
    }).find(item => item.id === 'sales');

    const unmatchedSales = buildModuleHealth({
      freshness: { sales: freshStatus, price: freshStatus, shipment: freshStatus },
      backupReminder: { stale: false, daysSince: 3, never: false },
      issues: [{ status: 'open' }, { status: 'resolved' }],
      costAlertData: { items: [] },
      todos: [],
      isMain: true,
    }).find(item => item.id === 'sales');

    expect(neverSales.status).toBe('bad');
    expect(neverSales.href).toBe('/menu-sales/upload');
    expect(unmatchedSales.status).toBe('warn');
    expect(unmatchedSales.href).toBe('/menu-sales/unmatched');
    expect(unmatchedSales.metric).toBe('미매칭 1건');
  });

  test('제때 상품은 단가와 출고 중 더 나쁜 상태를 따른다', () => {
    const jette = buildModuleHealth({
      freshness: { sales: freshStatus, price: staleStatus, shipment: neverStatus },
      backupReminder: { stale: false, daysSince: 3, never: false },
      issues: [],
      costAlertData: { items: [] },
      todos: [],
      isMain: true,
    }).find(item => item.id === 'jette');

    expect(jette.status).toBe('bad');
    expect(jette.metric).toContain('단가 2026.04');
    expect(jette.metric).toContain('출고 이력 없음');
  });

  test('비-main 브랜드에서는 제때 상품 헬스체크를 제외한다', () => {
    const modules = buildModuleHealth({
      freshness: { sales: freshStatus, price: neverStatus, shipment: neverStatus },
      backupReminder: { stale: false, daysSince: 3, never: false },
      issues: [],
      costAlertData: { items: [] },
      todos: [],
      isMain: false,
    });

    expect(modules.some(item => item.id === 'jette')).toBe(false);
  });

  test('원가 경보와 백업 이력 없음은 우선순위가 높은 문제로 집계된다', () => {
    const modules = buildModuleHealth({
      freshness: { sales: freshStatus, price: freshStatus, shipment: freshStatus },
      backupReminder: { stale: true, daysSince: null, never: true },
      issues: [],
      costAlertData: { items: [{ costRate: 41 }, { costRate: 34 }] },
      todos: [{ id: 1 }],
      isMain: true,
    });

    expect(modules.find(item => item.id === 'cost').status).toBe('bad');
    expect(modules.find(item => item.id === 'note').status).toBe('warn');
    expect(modules.find(item => item.id === 'system').status).toBe('bad');
    expect(countModuleHealth(modules)).toEqual({ good: 2, warn: 1, bad: 2 });
  });
});
