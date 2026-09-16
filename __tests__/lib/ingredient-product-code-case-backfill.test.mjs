import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let rows = [];

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(() => true),
  getAll: jest.fn(() => Promise.resolve([...rows])),
  runTransaction: jest.fn((_stores, _mode, work) => {
    work({
      objectStore() {
        return {
          put(record) {
            const idx = rows.findIndex(r => r.id === record.id);
            if (idx >= 0) rows[idx] = record;
            else rows.push(record);
          },
        };
      },
    });
    return Promise.resolve();
  }),
}));

const assertActiveAdmin = jest.fn();
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin }));

const { planProductCodeCaseBackfill, backfillProductCodeCase } =
  await import('../../lib/ingredient/migrate-product-code-case.js');

describe('planProductCodeCaseBackfill', () => {
  test('소문자·공백 코드만 대문자화 대상으로 고르고 나머지는 그대로 둔다', () => {
    const { toUpdate, skippedConflicts } = planProductCodeCaseBackfill([
      { id: 1, productCode: 'cc100' },
      { id: 2, productCode: ' CC200 ' },
      { id: 3, productCode: 'CC300' },
      { id: 4, productCode: '' },
      { id: 5, productCode: null },
      { id: 6 },
    ]);
    expect(toUpdate.map(r => [r.id, r.productCode])).toEqual([
      [1, 'CC100'],
      [2, 'CC200'],
    ]);
    expect(skippedConflicts).toEqual([]);
  });

  test('대문자화하면 다른 행과 겹치는(대소문자만 다른 중복) 행은 건너뛴다', () => {
    const { toUpdate, skippedConflicts } = planProductCodeCaseBackfill([
      { id: 1, productCode: 'cc100' },
      { id: 2, productCode: 'CC100' },
      { id: 3, productCode: 'cc200' },
    ]);
    expect(toUpdate.map(r => r.id)).toEqual([3]);
    expect(skippedConflicts.map(r => r.id)).toEqual([1]);
  });

  test('잘못된 입력에는 빈 계획을 돌려준다', () => {
    expect(planProductCodeCaseBackfill(null)).toEqual({ toUpdate: [], skippedConflicts: [] });
  });
});

describe('backfillProductCodeCase', () => {
  beforeEach(() => {
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
    rows = [
      { id: 1, productCode: 'cc100', ingredientName: 'A' },
      { id: 2, productCode: 'CC200', ingredientName: 'B' },
    ];
  });

  test('대상 행만 대문자로 put하고 updatedAt을 찍는다 — 멱등', async () => {
    const first = await backfillProductCodeCase();
    expect(first).toEqual({ updated: 1, skippedConflicts: 0 });
    expect(rows.find(r => r.id === 1).productCode).toBe('CC100');
    expect(rows.find(r => r.id === 1).updatedAt).toEqual(expect.any(String));
    expect(rows.find(r => r.id === 2)).toEqual({
      id: 2,
      productCode: 'CC200',
      ingredientName: 'B',
    });

    const second = await backfillProductCodeCase();
    expect(second).toEqual({ updated: 0, skippedConflicts: 0 });
  });

  test('viewer(권한 없음)면 아무것도 하지 않고 skipped:permission', async () => {
    assertActiveAdmin.mockRejectedValue(
      Object.assign(new Error('no'), { code: 'PERMISSION_DENIED' })
    );
    expect(await backfillProductCodeCase()).toEqual({
      updated: 0,
      skippedConflicts: 0,
      skipped: 'permission',
    });
    expect(rows.find(r => r.id === 1).productCode).toBe('cc100');
  });
});

describe('배선', () => {
  test('식자재 관리 데이터 로드 시 원산지 마이그레이션 옆에서 1회 실행된다', () => {
    const src = readFileSync(resolve('app/ingredient/manage/useIngredientManageData.js'), 'utf8');
    expect(src).toContain(
      "import { backfillProductCodeCase } from '@/lib/ingredient/migrate-product-code-case'"
    );
    expect(src).toContain('await backfillProductCodeCase().catch(');
  });

  test('쓰기 경로 3곳 모두 productCode를 trim().toUpperCase()로 저장한다', () => {
    const normalize = readFileSync(resolve('lib/ingredient/normalize.js'), 'utf8');
    const crud = readFileSync(resolve('lib/ingredient/crud.js'), 'utf8');
    const importSrc = readFileSync(resolve('lib/ingredient/import.js'), 'utf8');
    // prettier가 체인을 여러 줄로 나눌 수 있어 공백 무관 정규식으로 검사한다.
    expect(normalize).toMatch(
      /productCode:\s*\(data\.productCode \|\| ''\)\s*\.trim\(\)\s*\.toUpperCase\(\)\s*\|\| null/
    );
    expect(crud).toMatch(
      /const productCode = String\(rawProductCode \?\? ''\)\s*\.trim\(\)\s*\.toUpperCase\(\);/
    );
    expect(importSrc).toMatch(
      /productCode:\s*String\(it\.productCode \?\? ''\)\s*\.trim\(\)\s*\.toUpperCase\(\)\s*\|\| null/
    );
  });
});
