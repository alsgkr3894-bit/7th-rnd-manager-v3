import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from '@jest/globals';
import { buildRecord } from '@/lib/ingredient/normalize';

const formControllerSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientFormController.js'),
  'utf8'
);
const originSectionSource = readFileSync(
  resolve('app/ingredient/manage/IngredientOriginSection.jsx'),
  'utf8'
);
const allergenSectionSource = readFileSync(
  resolve('app/ingredient/manage/IngredientAllergenSection.jsx'),
  'utf8'
);
const dashboardSource = readFileSync(resolve('lib/nutrition/dashboard.js'), 'utf8');
const originPageSource = readFileSync(resolve('app/nutrition/origin/page.jsx'), 'utf8');

describe('ingredient none flags', () => {
  test('buildRecord persists explicit none flags separately from blank values', () => {
    const record = buildRecord({
      ingredientName: 'Salt',
      originNone: true,
      allergenNone: true,
      origin: [{ displayName: 'Salt', country: 'Korea' }],
      allergens: ['AL01'],
    });

    expect(record.originNone).toBe(true);
    expect(record.allergenNone).toBe(true);
    expect(record.origin).toEqual([{ displayName: 'Salt', country: 'Korea' }]);
    expect(record.allergens).toEqual(['AL01']);
  });

  test('ingredient form clears origin and allergen values when none is checked', () => {
    expect(formControllerSource).toContain('origin: form.originNone === true ? null : originValue');
    expect(formControllerSource).toContain('originNone: form.originNone === true');
    expect(formControllerSource).toContain(
      'allergens: form.allergenNone === true ? [] : form.allergens || []'
    );
    expect(formControllerSource).toContain('allergenNone: form.allergenNone === true');
  });

  test('form sections expose none checkboxes and disable conflicting inputs', () => {
    expect(originSectionSource).toContain('원산지 없음');
    expect(originSectionSource).toContain("onSet('originNone', e.target.checked)");
    expect(originSectionSource).toContain('disabled={originNone === true}');
    expect(allergenSectionSource).toContain('알레르기 없음');
    expect(allergenSectionSource).toContain("onSet('allergenNone', e.target.checked)");
    expect(allergenSectionSource).toContain('disabled={allergenNone === true}');
  });

  test('nutrition coverage treats explicit none flags as completed, not missing', () => {
    expect(dashboardSource).toContain('r.allergenNone === true');
    expect(dashboardSource).toContain('r.originNone === true');
    expect(originPageSource).toContain('i.originNone === true');
  });
});
