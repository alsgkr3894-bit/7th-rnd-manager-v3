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
  scaleToppingValuesToWeight,
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
const importModalSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingImportModal.jsx'),
  'utf8'
);
const importInputsSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingImportInputs.jsx'),
  'utf8'
);
const importPreviewSource = readFileSync(
  resolve('components/nutrition/menu/toppings/ToppingPreviewTable.jsx'),
  'utf8'
);
const importUtilsSource = readFileSync(
  resolve('components/nutrition/menu/toppings/toppingImportUtils.js'),
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
    expect(tabSource).toContain('<ToppingImportModal');
    expect(tabSource).toContain('downloadToppingImportTemplate');
    expect(tabSource).toContain('buildToppingSavePayload');
    expect(tabSource).not.toContain('<ModalFrame');
    expect(tabSource).not.toContain('<NutritionGrid');
    expect(tabSource).not.toContain('<IngredientSearch');
    expect(tabSource).not.toContain('<table');
    expect(tabSource.split('\n').length).toBeLessThanOrEqual(150);

    expect(headerSource).toContain('export function ToppingsHeader');
    expect(headerSource).toContain('추가토핑 영양성분');
    expect(headerSource).toContain('양식 다운로드');
    expect(headerSource).toContain('엑셀 가져오기');
    expect(emptySource).toContain('export function ToppingsEmptyState');
    expect(emptySource).toContain('등록된 추가토핑이 없어요');
    expect(tableSource).toContain('export function ToppingsTable');
    expect(tableSource).toContain('function ToppingRow');
    expect(tableSource).toContain('알레르기');
    expect(modalSource).toContain('export function ToppingEditModal');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('<NutritionGrid');
    expect(importModalSource).toContain('export function ToppingImportModal');
    expect(importModalSource).toContain('parseToppingExcel');
    expect(importModalSource).toContain('downloadToppingImportTemplate');
    expect(importModalSource).toContain('UploadDropzone');
    // 미리보기 표·입력 컨트롤·순수 헬퍼는 별도 파일로 분리됐다(모달은 조립만).
    expect(importPreviewSource).toContain('onPatchRow');
    expect(importPreviewSource).toContain('onIngredientInput');
    expect(importUtilsSource).toContain('export function ingredientAllergenText');
    expect(importUtilsSource).toContain('export function searchIngredientOptions');
    expect(importInputsSource).toContain('onCompositionStart');
    expect(importInputsSource).toContain('role="listbox"');
    expect(importInputsSource).toContain('type="number"');
    expect(utilsSource).toContain('export function buildToppingSavePayload');
  });

  test('중량을 바꾸면 나머지 영양성분이 저장값 비율로 자동 계산된다(모달 배선)', () => {
    // 기본값(baseline)은 모달을 열 때의 저장값 — TabToppings가 record에서 만들어 내려준다.
    expect(tabSource).toContain(
      "baseline={modal && modal !== 'add' ? utils.toppingValuesFromRecord(modal) : null}"
    );
    expect(modalSource).toContain('scaleToppingValuesToWeight');
    expect(modalSource).toContain("if (key !== 'weight') return { ...prev, [key]: value };");
    expect(modalSource).toContain('scaleToppingValuesToWeight(baseline, value)');
    expect(modalSource).toContain('에 비례해 자동 계산됩니다');
  });

  test('scaleToppingValuesToWeight — 저장 중량 대비 비율로 0.1 단위 비례 계산', () => {
    const baseline = {
      weight: 80,
      kcal: 200,
      carbs: '3.3',
      sugar: '',
      fat: 0,
      satFat: 10,
      transFat: null,
      cholesterol: 30,
      protein: '12',
      sodium: 400,
    };
    // 80g → 100g: ×1.25
    expect(scaleToppingValuesToWeight(baseline, 100)).toEqual({
      kcal: 250,
      carbs: 4.1, // 3.3 × 1.25 = 4.125 → 4.1
      sugar: '', // 빈칸 유지
      fat: 0,
      satFat: 12.5,
      transFat: '', // null도 빈칸으로
      cholesterol: 37.5,
      protein: 15,
      sodium: 500,
    });
    // 여러 번 바꿔도 항상 저장값 기준(누적 아님): 80 → 90 = ×1.125
    expect(scaleToppingValuesToWeight(baseline, '90').satFat).toBe(11.3);
    // 문자열 중량도 처리, 0g은 전부 0
    expect(scaleToppingValuesToWeight({ ...baseline, weight: '80' }, 0).satFat).toBe(0);
    // 비율을 구할 수 없으면 null — 저장 중량 없음/0, 새 중량이 숫자 아님/음수
    expect(scaleToppingValuesToWeight({ ...baseline, weight: '' }, 100)).toBeNull();
    expect(scaleToppingValuesToWeight({ ...baseline, weight: 0 }, 100)).toBeNull();
    expect(scaleToppingValuesToWeight(null, 100)).toBeNull();
    expect(scaleToppingValuesToWeight(baseline, '')).toBeNull();
    expect(scaleToppingValuesToWeight(baseline, 'abc')).toBeNull();
    expect(scaleToppingValuesToWeight(baseline, -5)).toBeNull();
    // weight 자체는 결과에 포함하지 않는다(호출부가 입력값 그대로 유지)
    expect(scaleToppingValuesToWeight(baseline, 100)).not.toHaveProperty('weight');
  });

  test('toppings write controls follow canEdit role state', () => {
    expect(tabSource).toContain('canEdit = false');
    expect(tabSource).toContain('if (!canEdit) return');
    expect(tabSource).toContain('canEdit={canEdit}');
    expect(tabSource).toContain('canEdit && modal');
    expect(tabSource).toContain('canEdit && importOpen');
    expect(headerSource).toContain('canEdit = false');
    expect(headerSource).toContain('disabled={!canEdit}');
    expect(tableSource).toContain('canEdit = false');
    expect(tableSource).toContain('disabled={!canEdit}');
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
    ).toMatchObject({
      id: 7,
      toppingCode: 'TOP-X',
      toppingName: 'X',
      basis: 'serving',
      weight: 30,
    });
  });
});

// 추가토핑 가져오기 모달은 상수·식자재 매칭 헬퍼·입력 컨트롤·미리보기 표가 한 파일
// (686줄)에 몰려 있었다. 역할별로 나누고 모달은 업로드/저장 흐름만 담당한다.
describe('추가토핑 가져오기 모달 파일 분리', () => {
  test('모달은 250줄을 넘지 않고 분리된 구현을 다시 품지 않는다', () => {
    expect(importModalSource.split('\n').length).toBeLessThanOrEqual(250);
    expect(importModalSource).not.toContain('function ToppingPreviewTable');
    expect(importModalSource).not.toContain('function IngredientConnectInput');
    expect(importModalSource).not.toContain('function buildIngredientOptions');
  });

  test('분리된 파일이 각자 한 책임을 갖고 200줄을 넘지 않는다', () => {
    expect(importUtilsSource).toContain('export function buildIngredientOptions');
    expect(importUtilsSource).toContain('export const STATUS');
    expect(importInputsSource).toContain('export function IngredientConnectInput');
    expect(importInputsSource).toContain('export function NumberImportInput');
    expect(importPreviewSource).toContain('export function ToppingPreviewTable');
    for (const source of [importUtilsSource, importInputsSource, importPreviewSource]) {
      expect(source.split('\n').length).toBeLessThanOrEqual(200);
    }
  });
});
