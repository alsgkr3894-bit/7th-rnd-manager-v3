import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildToppingIngredientLookups,
  buildToppingSavePayload,
  EMPTY_TOPPING_FORM,
  findLinkedToppingIngredient,
  formatToppingNutritionValue,
  normalizeToppingIngredientName,
  normalizeToppingIngredients,
  toppingAllergenText,
  toppingFormFromRecord,
  toppingIngredientNameKey,
  toppingValuesFromRecord,
} from '../../components/nutrition/menu/toppings/toppingUtils.js';

const tabSource = readFileSync(resolve('components/nutrition/menu/TabToppings.jsx'), 'utf8');
const headerSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingsHeader.jsx'),
  'utf8'
);
const emptySource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingsEmptyState.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingsTable.jsx'),
  'utf8'
);
const modalSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingEditModal.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/nutrition/menu/toppings/toppingUtils.js'),
  'utf8'
);

describe('nutrition toppings tab structure', () => {
  test('TabToppings delegates header, empty state, table, modal, and helpers', () => {
    expect(tabSource).toContain('<ToppingsHeader');
    expect(tabSource).toContain('<ToppingsEmptyState');
    expect(tabSource).toContain('<ToppingsTable');
    expect(tabSource).toContain('<ToppingEditModal');
    expect(tabSource).toContain('buildToppingSavePayload');
    expect(tabSource).not.toContain('<ModalFrame');
    expect(tabSource).not.toContain('<NutritionGrid');
    expect(tabSource).not.toContain('<IngredientSearch');
    expect(tabSource).not.toContain('<table');
    expect(tabSource.split('\n').length).toBeLessThanOrEqual(150);

    expect(headerSource).toContain('export function ToppingsHeader');
    expect(headerSource).toContain('추가토핑 영양성분');
    expect(emptySource).toContain('export function ToppingsEmptyState');
    expect(emptySource).toContain('등록된 추가토핑이 없어요');
    expect(tableSource).toContain('export function ToppingsTable');
    expect(tableSource).toContain('function ToppingRow');
    expect(tableSource).toContain('알레르기');
    expect(modalSource).toContain('export function ToppingEditModal');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('<NutritionGrid');
    expect(utilsSource).toContain('export function buildToppingSavePayload');
  });

  test('helpers keep ingredient lookup, allergen display, formatting, and save payload stable', () => {
    const ingredients = [
      { productCode: 'ING-1', ingredientName: '체다 치즈', allergens: ['AL02', 'AL99'] },
      { productCode: 'ING-2', displayName: '페퍼 로니', allergens: ['AL06'] },
      { productCode: 'ING-3', productName: '양파', allergens: [] },
    ];
    const normalized = normalizeToppingIngredients(ingredients);
    const lookups = buildToppingIngredientLookups(normalized);

    expect(normalizeToppingIngredientName({ productCode: 'ING-X' })).toBe('ING-X');
    expect(toppingIngredientNameKey(' 페퍼 로니 ')).toBe('페퍼로니');
    expect(normalized[1].ingredientName).toBe('페퍼 로니');
    expect(findLinkedToppingIngredient({ productCode: 'ING-1' }, lookups)?.ingredientName).toBe(
      '체다 치즈'
    );
    expect(findLinkedToppingIngredient({ ingredientName: '페퍼로니' }, lookups)?.productCode).toBe(
      'ING-2'
    );
    expect(toppingAllergenText({ productCode: 'ING-1' }, lookups)).toBe('우유, AL99');
    expect(toppingAllergenText({ productCode: 'NONE' }, lookups)).toBe('없음');
    expect(formatToppingNutritionValue('', 'g')).toBe('미입력');
    expect(formatToppingNutritionValue('1234.4', 'kcal')).toBe('1,234kcal');
    expect(formatToppingNutritionValue('abc', 'g')).toBe('abc');
    expect(toppingFormFromRecord('add')).toEqual(EMPTY_TOPPING_FORM);
    expect(
      toppingFormFromRecord({
        toppingCode: 'TOP-1',
        toppingName: '페퍼로니',
        productCode: 'ING-2',
        ingredientName: '페퍼 로니',
      })
    ).toEqual({
      toppingCode: 'TOP-1',
      toppingName: '페퍼로니',
      productCode: 'ING-2',
      ingredientName: '페퍼 로니',
    });
    expect(toppingValuesFromRecord({ kcal: 10, weight: 20 })).toMatchObject({
      kcal: 10,
      weight: 20,
    });
    expect(
      buildToppingSavePayload({
        modal: 'add',
        form: { ...EMPTY_TOPPING_FORM, toppingName: ' 치즈 추가 ' },
        values: { kcal: 10 },
        now: 123,
      })
    ).toMatchObject({
      toppingCode: 'TOP-123',
      toppingName: '치즈 추가',
      basis: 'serving',
      kcal: 10,
    });
    expect(
      buildToppingSavePayload({
        modal: { id: 7 },
        form: { ...EMPTY_TOPPING_FORM, toppingCode: 'TOP-X', toppingName: 'X' },
        values: { weight: 30 },
      })
    ).toMatchObject({ id: 7, toppingCode: 'TOP-X', toppingName: 'X', basis: 'serving', weight: 30 });
  });
});
