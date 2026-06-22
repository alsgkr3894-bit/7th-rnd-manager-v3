import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

let activeBrand = 'main';
const stores = new Set(['sales_files', 'shipment_files', 'price_files']);
let salesFiles = [];
let shipmentFiles = [];
let priceFiles = [];

const getUploadedFiles = jest.fn(async () => salesFiles);
const getShipmentFiles = jest.fn(async () => shipmentFiles);
const getPriceFiles = jest.fn(async () => priceFiles);
const hasStore = jest.fn(storeName => stores.has(storeName));

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => activeBrand,
}));

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore,
}));

jest.unstable_mockModule('@/lib/sales', () => ({
  getUploadedFiles,
}));

jest.unstable_mockModule('@/lib/shipment/store-files', () => ({
  getShipmentFiles,
}));

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles,
}));

const savedViews = await import('@/lib/saved-views');
const packagePlan = await import('@/lib/report/package-plan');
const changeLog = await import('@/lib/change-log');
const actionState = await import('@/lib/action-center/state');

beforeEach(() => {
  global.localStorage = new MemoryStorage();
  activeBrand = 'main';
  stores.clear();
  stores.add('sales_files');
  stores.add('shipment_files');
  stores.add('price_files');
  salesFiles = [];
  shipmentFiles = [];
  priceFiles = [];
  getUploadedFiles.mockClear();
  getShipmentFiles.mockClear();
  getPriceFiles.mockClear();
  hasStore.mockClear();
});

describe('saved views state helpers', () => {
  test('저장 뷰는 브랜드별로 분리되고 손상된 값은 안전하게 무시한다', () => {
    savedViews.saveView('ingredient-manage', ' 단가없음 ', { catFilter: '__no_price__' });
    activeBrand = 'china4';
    savedViews.saveView('ingredient-manage', '중국브랜드', { search: '치즈' });

    expect(savedViews.getSavedViews('ingredient-manage')).toEqual([
      expect.objectContaining({ name: '중국브랜드', filters: { search: '치즈' } }),
    ]);

    activeBrand = 'main';
    expect(savedViews.getSavedViews('ingredient-manage')).toEqual([
      expect.objectContaining({ name: '단가없음', filters: { catFilter: '__no_price__' } }),
    ]);

    localStorage.setItem('saved_views_v1__main__ingredient-manage', JSON.stringify(['bad', null]));
    expect(savedViews.getSavedViews('ingredient-manage')).toEqual([]);
  });

  test('삭제는 기본 뷰를 해제하고 이름변경은 중복 이름을 병합한다', () => {
    savedViews.saveView('margin', '기본', { category: '피자' });
    savedViews.saveView('margin', '보조', { category: '사이드' });
    savedViews.setDefaultView('margin', '기본');

    savedViews.renameView('margin', '기본', '보조');

    expect(savedViews.getDefaultView('margin')).toBe('보조');
    expect(savedViews.getSavedViews('margin')).toEqual([
      expect.objectContaining({ name: '보조', filters: { category: '피자' } }),
    ]);

    savedViews.deleteView('margin', '보조');
    expect(savedViews.getSavedViews('margin')).toEqual([]);
    expect(savedViews.getDefaultView('margin')).toBeNull();
  });

  test('screen 이름은 백업 가능한 localStorage 키 패턴으로 정규화한다', () => {
    savedViews.saveView('cost/margin view', '필터', { category: '피자' });
    savedViews.setDefaultView('cost/margin view', '필터');

    expect(localStorage.getItem('saved_views_v1__main__cost-margin-view')).toBeTruthy();
    expect(localStorage.getItem('saved_views_v1_default__main__cost-margin-view')).toBe('필터');
    expect(savedViews.getSavedViews('cost/margin view')).toEqual([
      expect.objectContaining({ name: '필터', filters: { category: '피자' } }),
    ]);

    savedViews.saveView(' / ', '무시', {});
    expect(localStorage.getItem('saved_views_v1__main__')).toBeNull();
  });
});

describe('monthly close package plan', () => {
  test('판매량 가용성은 실제 sales_files store를 기준으로 판단한다', async () => {
    salesFiles = [{ year: 2026, month: 6, fileName: 'sales.xlsx' }];
    shipmentFiles = [{ year: 2026, month: 6, fileName: 'ship.xlsx' }];
    priceFiles = [{ updateDate: '2026-06-01' }];

    const availability = await packagePlan.checkPeriodDataAvailability({ year: 2026, month: 6 });

    expect(availability).toEqual({ sales: true, shipment: true, price: true });
    expect(getUploadedFiles).toHaveBeenCalledTimes(1);
  });

  test('월마감 로그는 손상된 저장값을 버리고 최근 12개월만 유지한다', () => {
    localStorage.setItem('monthly_close_log_v1', '{bad');

    for (let monthOffset = 0; monthOffset < 13; monthOffset += 1) {
      const date = new Date(2026, monthOffset, 1);
      packagePlan.saveCloseLog(date.getFullYear(), date.getMonth() + 1, ['sales', 'cost']);
    }

    const logs = packagePlan.getCloseLogs();
    expect(logs).toHaveLength(12);
    expect(packagePlan.getCloseLog(2027, 1)).toEqual(
      expect.objectContaining({ year: 2027, month: 1, completedItems: ['sales', 'cost'] })
    );
    expect(packagePlan.getCloseLog(2026, 1)).toBeNull();
  });

  test('월마감 로그는 잘못된 기간과 완료 항목을 저장하지 않는다', async () => {
    packagePlan.saveCloseLog(2026, 13, ['sales']);
    packagePlan.saveCloseLog(2026, 0, ['sales']);
    packagePlan.saveCloseLog(2026, 6, ['sales', 'unknown', 'sales', null, 'cost']);

    expect(packagePlan.getCloseLogs()).toEqual([
      expect.objectContaining({ year: 2026, month: 6, completedItems: ['sales', 'cost'] }),
    ]);
    expect(packagePlan.getCloseLog(2026, 13)).toBeNull();

    const availability = await packagePlan.checkPeriodDataAvailability({ year: 2026, month: 13 });
    expect(availability).toEqual({ sales: false, shipment: false, price: false });
    expect(getUploadedFiles).not.toHaveBeenCalled();
    expect(getShipmentFiles).not.toHaveBeenCalled();
    expect(getPriceFiles).not.toHaveBeenCalled();
  });

  test('월마감 로그 조회는 기존 손상 행을 정규화해서 반환한다', () => {
    localStorage.setItem(
      'monthly_close_log_v1',
      JSON.stringify({
        '2026-06': {
          year: 2026,
          month: 6,
          completedItems: ['sales', 'bad', 'sales', 'shipment'],
          completedAt: '2026-06-30T00:00:00.000Z',
        },
        '2026-13': {
          year: 2026,
          month: 13,
          completedItems: ['sales'],
          completedAt: '2026-13-01T00:00:00.000Z',
        },
        '2026-05': {
          year: 2026,
          month: 5,
          completedItems: ['cost'],
          completedAt: 'not-date',
        },
      })
    );

    expect(packagePlan.getCloseLogs()).toEqual([
      {
        year: 2026,
        month: 6,
        completedItems: ['sales', 'shipment'],
        completedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);
    expect(packagePlan.getCloseLog(2026, 6)).toEqual(
      expect.objectContaining({ completedItems: ['sales', 'shipment'] })
    );
  });
});

describe('change log state helpers', () => {
  test('손상된 저장값이 있어도 새 변경 이력을 기록한다', () => {
    localStorage.setItem('change_log_v1', 'not-json');

    changeLog.logIngredientSave('치즈', true);

    expect(changeLog.getChangeLogs()).toEqual([
      expect.objectContaining({
        type: 'ingredient:save',
        label: '식자재 추가: 치즈',
        brand: 'main',
        reversible: false,
      }),
    ]);
  });

  test('브랜드·타입·limit 필터가 최신순 이력에 적용된다', () => {
    changeLog.logPriceUpload('price.xlsx', 10);
    activeBrand = 'china4';
    changeLog.logBackupRestore('china4-backup.json');
    changeLog.logIngredientDelete('중국 치즈');

    expect(changeLog.filterChangeLogs({ brand: 'china4', limit: 1 })).toEqual([
      expect.objectContaining({ type: 'ingredient:delete', brand: 'china4' }),
    ]);
    expect(changeLog.filterChangeLogs({ type: 'backup:restore' })).toEqual([
      expect.objectContaining({
        type: 'backup:restore',
        detail: '복원 후 되돌리기 불가',
        reverseHint: null,
      }),
    ]);
  });

  test('변경 이력 초기화는 브랜드 필터가 있으면 해당 브랜드만 삭제한다', () => {
    changeLog.logPriceUpload('main-price.xlsx', 10);
    activeBrand = 'china4';
    changeLog.logIngredientDelete('중국 치즈');

    changeLog.clearChangeLogs({ brand: 'china4' });

    expect(changeLog.getChangeLogs()).toEqual([
      expect.objectContaining({ type: 'upload:price', brand: 'main' }),
    ]);

    changeLog.clearChangeLogs();
    expect(changeLog.getChangeLogs()).toEqual([]);
  });

  test('손상된 change log type/detail/limit 값은 UI 안전 형태로 정규화한다', () => {
    localStorage.setItem(
      'change_log_v1',
      JSON.stringify([
        {
          id: 'bad-type',
          type: { bad: true },
          label: '깨진 타입',
          detail: 'skip',
          brand: 'main',
        },
        {
          id: 'object-detail',
          type: 'upload:price',
          label: ' 단가 업로드 ',
          detail: { rows: 10 },
          reverseHint: { bad: true },
          reversible: true,
          at: 123,
          brand: ' main ',
        },
      ])
    );

    expect(changeLog.getChangeLogs()).toEqual([
      {
        id: 'object-detail',
        type: 'upload:price',
        label: '단가 업로드',
        detail: '[object Object]',
        reversible: false,
        reverseHint: null,
        at: '123',
        brand: 'main',
      },
    ]);
    expect(changeLog.filterChangeLogs({ type: { bad: true }, limit: -1 })).toHaveLength(1);

    changeLog.logChange('unknown:type', '무시');
    expect(changeLog.getChangeLogs()).toHaveLength(1);
  });

  test('변경 이력 초기화 UI는 관리자 권한 확인 뒤에만 실행된다', () => {
    const source = readFileSync(
      new URL('../../components/change-log/ChangeHistoryPanel.jsx', import.meta.url),
      'utf8'
    );

    expect(source).toContain("import { useCurrentRole } from '@/hooks/useCurrentRole'");
    expect(source).toContain('const canClear = roleReady && isAdmin');
    expect(source).toContain('if (!canClear) return;');
    expect(source).toContain('disabled={!canClear}');
  });
});

describe('action center state helpers', () => {
  test('localStorage가 없어도 기본 상태로 안전하게 동작한다', () => {
    delete global.localStorage;

    expect(actionState.getActionState()).toEqual({ dismissed: {}, snoozed: {} });
    expect(
      actionState.filterByState([{ id: 'backup', title: '백업', severity: 'warn' }])
    ).toHaveLength(1);

    expect(() => actionState.dismissAction('backup')).not.toThrow();
    expect(() => actionState.snoozeAction('backup', '7d')).not.toThrow();
    expect(() => actionState.undismissAction('backup')).not.toThrow();
  });

  test('비어 있는 action id는 저장하지 않고 손상된 상태값은 읽을 때 정규화한다', () => {
    actionState.dismissAction('');
    actionState.snoozeAction(null, '7d');
    expect(actionState.getActionState()).toEqual({ dismissed: {}, snoozed: {} });

    localStorage.setItem(
      'action_center_state_v1',
      JSON.stringify({
        dismissed: { backup: true, bad: 'yes', '   ': true },
        snoozed: { price: String(Date.now() + 1000), old: 'not-number', blank: null },
      })
    );

    const state = actionState.getActionState();
    expect(state.dismissed).toEqual({ backup: true });
    expect(Object.keys(state.snoozed)).toEqual(['price']);
    expect(
      actionState.filterByState([
        { id: 'backup', title: '백업' },
        { id: 'price', title: '단가' },
        { id: 'visible', title: '표시' },
      ])
    ).toEqual([{ id: 'visible', title: '표시' }]);
  });
});
