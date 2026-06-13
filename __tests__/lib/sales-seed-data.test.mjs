import { describe, expect, test } from '@jest/globals';
import { INGREDIENT_MASTER_SEED } from '../../lib/ingredient/master-seed.js';
import { MASTER_IMPORT_SEED } from '../../lib/ingredient/master-import-seed.js';
import { SALES_RULES } from '../../lib/sales/classify-rules.js';

function ruleKey(rule) {
  return `${rule.category}|${rule.groupName}|${rule.detailName}|${String(rule.pattern)}`;
}

describe('seed and sales rule data', () => {
  test('sales rules have unique ids and required fields', () => {
    const ids = new Set();
    const keys = new Set();

    for (const rule of SALES_RULES) {
      expect(rule && typeof rule).toBe('object');
      expect(typeof rule.ruleId).toBe('string');
      expect(ids.has(rule.ruleId)).toBe(false);
      ids.add(rule.ruleId);

      expect(['exact', 'pattern']).toContain(rule.matchType);
      expect(
        rule.matchType === 'pattern'
          ? rule.pattern instanceof RegExp
          : typeof rule.pattern === 'string'
      ).toBe(true);
      expect(typeof rule.category).toBe('string');
      expect(typeof rule.groupName).toBe('string');
      expect(typeof rule.detailName).toBe('string');

      const key = ruleKey(rule);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  test('representative category fixtures remain registered', () => {
    const byPattern = new Map(SALES_RULES.map(rule => [String(rule.pattern), rule]));

    expect(byPattern.get('뉴더블치즈피자')).toMatchObject({ category: '피자' });
    expect(byPattern.get('더블치즈')).toMatchObject({ category: '1인피자' });
    expect(byPattern.get('오븐스파게티')).toMatchObject({ category: '사이드' });
    expect(byPattern.get('파마산')).toMatchObject({ category: '사이드(소스)' });
    expect([...SALES_RULES].some(rule => rule.category === '엣지&도우')).toBe(true);
    expect([...SALES_RULES].some(rule => rule.category === '세트메뉴')).toBe(true);
    expect([...SALES_RULES].some(rule => rule.category === '품목제외')).toBe(true);
  });

  test('ingredient seed files have unique product codes and valid composite refs', () => {
    for (const rows of [INGREDIENT_MASTER_SEED, MASTER_IMPORT_SEED]) {
      const codes = new Set();
      for (const row of rows) {
        expect(typeof row.productCode).toBe('string');
        expect(row.productCode.trim()).toBe(row.productCode);
        expect(codes.has(row.productCode)).toBe(false);
        codes.add(row.productCode);
        expect(typeof (row.productName || row.ingredientName)).toBe('string');
      }
    }

    const rows = [...INGREDIENT_MASTER_SEED, ...MASTER_IMPORT_SEED];
    const codes = new Set(rows.map(row => row.productCode));
    for (const row of rows) {
      const refs = Array.isArray(row.compositeOf) ? row.compositeOf : [];
      for (const ref of refs) {
        const productCode = typeof ref === 'string' ? ref : ref?.productCode;
        expect(codes.has(productCode)).toBe(true);
      }
    }
  });
});
