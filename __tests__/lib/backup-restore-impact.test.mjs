import { describe, expect, test } from '@jest/globals';
import {
  buildRestoreImpact,
  pickRestoreStores,
  selectedStoresMissingFromBackup,
} from '../../lib/backup/restore-impact.js';

describe('backup restore impact', () => {
  test('실제 복원 대상 store만 선택해 payload를 만든다', () => {
    expect(
      pickRestoreStores(
        {
          settings: [{ id: 1 }],
          sales_rows: [{ id: 2 }],
          legacy_store: [{ id: 3 }],
        },
        ['settings', 'sales_rows']
      )
    ).toEqual({
      settings: [{ id: 1 }],
      sales_rows: [{ id: 2 }],
    });
  });

  test('백업 파일에 없는 선택 store는 예상 삭제로 계산하지 않는다', () => {
    const impact = buildRestoreImpact(
      {
        settings: [{ id: 1 }],
        sales_rows: [{ id: 1 }, { id: 2 }],
      },
      {
        settings: 1,
        sales_rows: 99,
        price_rows: 5,
      },
      ['settings', 'sales_rows', 'price_rows']
    );

    expect(impact.rows.map(r => r.name)).toEqual(['settings', 'sales_rows']);
    expect(impact.rows.find(r => r.name === 'price_rows')).toBeUndefined();
    expect(impact.totalNow).toBe(100);
    expect(impact.totalAfter).toBe(3);
    expect(impact.storeCount).toBe(2);
    expect(
      selectedStoresMissingFromBackup(
        { settings: [], sales_rows: [] },
        { settings: 1, sales_rows: 2, price_rows: 5, shipment_rows: 0 },
        ['settings', 'sales_rows', 'price_rows', 'shipment_rows']
      )
    ).toEqual(['price_rows']);
  });

  test('백업에 빈 배열로 포함된 store는 실제 삭제 영향으로 계산한다', () => {
    expect(buildRestoreImpact({ sales_rows: [] }, { sales_rows: 4 }, ['sales_rows']).rows).toEqual([
      { name: 'sales_rows', now: 4, after: 0, diff: -4 },
    ]);
  });
});
