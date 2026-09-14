import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { buildRecord } from '../../lib/ingredient/normalize.js';
import { buildMetaOnlyRow, mergeIngredientRows } from '../../lib/ingredient/index.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('buildRecord — pieceWeightGrams(1개당 g)', () => {
  test("baseUnitType이 '개'일 때만 값을 저장한다", () => {
    expect(
      buildRecord({ ingredientName: 'A', baseUnitType: '개', pieceWeightGrams: '25' })
        .pieceWeightGrams
    ).toBe(25);
  });

  test("baseUnitType이 'g'이면 입력값이 있어도 null로 버린다", () => {
    expect(
      buildRecord({ ingredientName: 'A', baseUnitType: 'g', pieceWeightGrams: '25' })
        .pieceWeightGrams
    ).toBeNull();
  });

  test('빈 값·미입력은 null', () => {
    expect(buildRecord({ ingredientName: 'A', baseUnitType: '개' }).pieceWeightGrams).toBeNull();
    expect(
      buildRecord({ ingredientName: 'A', baseUnitType: '개', pieceWeightGrams: '' })
        .pieceWeightGrams
    ).toBeNull();
  });

  test('음수면 에러를 던진다', () => {
    expect(() =>
      buildRecord({ ingredientName: 'A', baseUnitType: '개', pieceWeightGrams: '-1' })
    ).toThrow('1개당 g은 0 이상이어야 합니다');
  });
});

describe('mergeIngredientRows / buildMetaOnlyRow — pieceWeightGrams 전달', () => {
  test('mergeIngredientRows가 meta.pieceWeightGrams를 행에 실어 보낸다', () => {
    const priceRows = [
      {
        productCode: 'A1',
        productName: '스팸',
        priceWithTax: 5000,
        temperature: '상온',
        salesUnit: '개',
        taxType: '과세',
        price: 5000,
      },
    ];
    const metaMap = new Map([['A1', { id: 1, baseUnitType: '개', pieceWeightGrams: 25 }]]);
    const rows = mergeIngredientRows(priceRows, metaMap);
    expect(rows[0].pieceWeightGrams).toBe(25);
  });

  test('메타가 없으면 pieceWeightGrams는 null', () => {
    const priceRows = [
      {
        productCode: 'B1',
        productName: '설탕',
        priceWithTax: 1000,
        temperature: '상온',
        salesUnit: 'g',
        taxType: '과세',
        price: 1000,
      },
    ];
    const rows = mergeIngredientRows(priceRows, new Map());
    expect(rows[0].pieceWeightGrams).toBeNull();
  });

  test('buildMetaOnlyRow가 pieceWeightGrams를 전달한다', () => {
    const row = buildMetaOnlyRow({
      id: 2,
      ingredientName: '계란',
      baseUnitType: '개',
      baseQuantity: 30,
      priceOverride: 6000,
      pieceWeightGrams: 60,
    });
    expect(row.pieceWeightGrams).toBe(60);
  });
});

describe('1개당 g 필드가 저장 경로·폼·표시에 배선돼 있다', () => {
  test('upsertIngredientMeta(crud.js)가 pieceWeightGrams를 명시 화이트리스트에 포함한다', () => {
    const crudSrc = src('lib/ingredient/crud.js');
    expect(crudSrc).toContain('pieceWeightGrams:');
    expect(crudSrc).toContain('patch.pieceWeightGrams');
  });

  test('폼 컨트롤러가 EMPTY·toForm·validate·handleSubmit에서 pieceWeightGrams를 다룬다', () => {
    const ctrlSrc = src('app/ingredient/manage/useIngredientFormController.js');
    expect(ctrlSrc).toContain("pieceWeightGrams: ''");
    expect(ctrlSrc).toContain('pieceWeightGrams: r.pieceWeightGrams != null');
    expect(ctrlSrc).toContain('e.pieceWeightGrams');
    expect(ctrlSrc).toContain('const pieceWeightGrams =');
    expect(ctrlSrc).toContain('parseOptionalNonNegativeNumber(form.pieceWeightGrams).value');
  });

  test("PackageQuantityField가 baseUnitType==='개'일 때만 '1개당 g' 입력을 보여준다", () => {
    const fieldSrc = src('app/ingredient/manage/IngredientPackageQuantityField.jsx');
    expect(fieldSrc).toContain("form.baseUnitType === '개' && (");
    expect(fieldSrc).toContain('label="1개당 g"');
    expect(fieldSrc).toContain("onSet('pieceWeightGrams'");
  });

  test('dedupe-repair가 pieceWeightGrams를 병합 필드 목록에 포함한다', () => {
    const dedupeSrc = src('lib/ingredient/dedupe-repair.js');
    expect(dedupeSrc).toContain("'pieceWeightGrams'");
  });

  test('manageRowUtils가 1개당 원가·g·g당 원가를 계산한다', () => {
    const utilsSrc = src('components/ingredient/manage-row/manageRowUtils.js');
    expect(utilsSrc).toContain('isPieceUnit');
    expect(utilsSrc).toContain('perGramPrice');
    expect(utilsSrc).toContain("import { roundUnitPrice } from '@/lib/cost/unit-policy'");
  });

  test('ManageRowPriceCell이 개당 정보를 보조로 렌더한다', () => {
    const cellSrc = src('components/ingredient/manage-row/ManageRowPriceCell.jsx');
    expect(cellSrc).toContain('showPieceInfo');
    expect(cellSrc).toContain('1개당 {formatNumber(unitPrice)}원');
  });
});
