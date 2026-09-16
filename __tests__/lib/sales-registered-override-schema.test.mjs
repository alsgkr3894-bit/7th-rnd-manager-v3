import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { DB_VERSION, ALL_STORES } from '../../lib/db/constants.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('ref_registered_overrides 스키마 배선', () => {
  test('ALL_STORES에 ref_registered_overrides가 있다', () => {
    expect(ALL_STORES).toContain('ref_registered_overrides');
  });

  test('DB_VERSION이 28 이상이다(신규 store 추가)', () => {
    expect(DB_VERSION).toBeGreaterThanOrEqual(28);
  });

  test('schema/sales.js가 ref_registered_overrides store를 만든다', () => {
    const s = src('lib/db/schema/sales.js');
    expect(s).toContain("createObjectStore('ref_registered_overrides'");
    expect(s).toContain("createIndex('menuName'");
  });

  test('sales 백업 그룹에 ref_registered_overrides가 포함된다(ref_discontinued와 함께)', () => {
    const s = src('lib/db/module-stores.js');
    const salesGroupStart = s.indexOf('sales: {');
    const salesGroupBody = s.slice(salesGroupStart, salesGroupStart + 400);
    expect(salesGroupBody).toContain('ref_discontinued');
    expect(salesGroupBody).toContain('ref_registered_overrides');
  });

  test('prisma/store-catalog.mjs에 ref_registered_overrides 항목이 있다', () => {
    const s = src('prisma/store-catalog.mjs');
    expect(s).toContain('ref_registered_overrides:');
  });
});
