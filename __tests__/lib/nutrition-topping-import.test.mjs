import { describe, expect, test } from '@jest/globals';
import {
  buildToppingImportTemplateSheets,
  buildToppingImportRows,
  toToppingImportRecord,
} from '../../lib/nutrition/values/topping-import.js';

describe('nutrition topping import', () => {
  test('엑셀 행을 추가토핑 미리보기 행으로 만들고 식자재코드를 연결한다', () => {
    const rows = buildToppingImportRows({
      rawRows: [
        {
          toppingCode: 'TOP-PEP',
          toppingName: '페퍼로니 추가',
          productCode: 'ING-PEP',
          values: { weight: 30, kcal: 55, protein: 4 },
        },
      ],
      ingredients: [{ productCode: 'ING-PEP', ingredientName: '페퍼로니', allergens: ['AL06'] }],
    });

    expect(rows[0]).toMatchObject({
      status: 'ready',
      include: true,
      toppingCode: 'TOP-PEP',
      toppingName: '페퍼로니 추가',
      productCode: 'ING-PEP',
      ingredientName: '페퍼로니',
      hasIngredientMatch: true,
      values: { weight: 30, kcal: 55, protein: 4 },
    });
  });

  test('식자재코드는 공백과 대소문자 차이가 있어도 연결한다', () => {
    const rows = buildToppingImportRows({
      rawRows: [
        {
          toppingName: '치즈 추가',
          productCode: ' ing-cheese ',
          values: { kcal: 20 },
        },
      ],
      ingredients: [{ productCode: 'ING-CHEESE', ingredientName: '모짜렐라치즈' }],
    });

    expect(rows[0]).toMatchObject({
      productCode: 'ING-CHEESE',
      ingredientName: '모짜렐라치즈',
      hasIngredientMatch: true,
    });
  });

  test('다운로드 양식은 입력 시트와 식자재코드 목록 시트를 만든다', () => {
    const sheets = buildToppingImportTemplateSheets([
      {
        productCode: 'ING-001',
        ingredientName: '치즈',
        allergens: ['AL02'],
        origin: [{ displayName: '치즈', country: '국내산' }],
      },
    ]);

    expect(sheets.toppingRows[0]).toEqual(
      expect.arrayContaining(['추가토핑명', '식자재코드', '포화지방(g)', '나트륨(mg)'])
    );
    expect(sheets.ingredientRows[0]).toEqual(['식자재코드', '식자재명', '알레르기코드', '원산지']);
    expect(sheets.ingredientRows[1]).toEqual(['ING-001', '치즈', 'AL02', '치즈:국내산']);
  });

  test('기존 추가토핑과 이름이 같으면 기존 코드와 id를 이어받는다', () => {
    const rows = buildToppingImportRows({
      rawRows: [{ toppingName: '치즈 추가', values: { kcal: 10 } }],
      toppings: [{ id: 7, toppingCode: 'TOP-CHZ', toppingName: '치즈 추가' }],
    });

    expect(rows[0]).toMatchObject({
      status: 'exists',
      existingId: 7,
      toppingCode: 'TOP-CHZ',
      toppingName: '치즈 추가',
    });
  });

  test('저장 레코드는 코드가 없으면 가져오기용 자동 코드를 만든다', () => {
    const record = toToppingImportRecord(
      {
        toppingName: '양파 추가',
        ingredientName: '양파',
        values: { weight: 20, kcal: 8, sugar: '' },
      },
      1,
      12345
    );

    expect(record).toMatchObject({
      toppingCode: 'TOP-12345-002',
      toppingName: '양파 추가',
      ingredientName: '양파',
      basis: 'serving',
      weight: 20,
      kcal: 8,
    });
    expect(record).not.toHaveProperty('sugar');
  });

  test('추가토핑명이 없으면 확인필요로 표시하고 저장 대상에서 제외한다', () => {
    const rows = buildToppingImportRows({
      rawRows: [{ productCode: 'ING-ONLY', values: { kcal: 10 } }],
      ingredients: [],
    });

    expect(rows[0]).toMatchObject({
      status: 'invalid',
      include: false,
    });
  });
});
