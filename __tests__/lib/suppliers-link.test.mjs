import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildSupplierIngredientMap,
  normalizeSupplierKey,
  supplierNameOptions,
} from '../../lib/cost/suppliers/link.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('normalizeSupplierKey', () => {
  test('공백·대소문자를 무시하고 같은 이름을 같은 키로 만든다', () => {
    expect(normalizeSupplierKey(' CJ 제일제당 ')).toBe(normalizeSupplierKey('cj제일제당'));
    expect(normalizeSupplierKey('Daerim Susan')).toBe(normalizeSupplierKey('daerimsusan'));
    expect(normalizeSupplierKey(null)).toBe('');
    expect(normalizeSupplierKey(undefined)).toBe('');
  });
});

describe('buildSupplierIngredientMap', () => {
  const suppliers = [
    { id: 1, name: 'CJ제일제당' },
    { id: 2, name: '대림수산' },
  ];

  test('정규화 후 이름이 같은 식자재를 공급업체별로 모은다', () => {
    const rows = [
      { id: 10, productCode: 'A1', ingredientName: '스팸', manufacturer: 'CJ 제일제당' },
      { id: 11, productCode: 'A2', ingredientName: '백설탕', manufacturer: 'cj제일제당' },
      { id: 12, productCode: 'B1', ingredientName: '새우', manufacturer: '대림수산' },
      { id: 13, productCode: 'C1', ingredientName: '무관한재료', manufacturer: '등록안된업체' },
    ];
    const map = buildSupplierIngredientMap(suppliers, rows);
    expect(map.get(1).map(r => r.productCode)).toEqual(['A1', 'A2']);
    expect(map.get(2).map(r => r.productCode)).toEqual(['B1']);
  });

  test('excluded 행은 제외한다', () => {
    const rows = [
      {
        id: 10,
        productCode: 'A1',
        ingredientName: '스팸',
        manufacturer: 'CJ제일제당',
        excluded: true,
      },
    ];
    const map = buildSupplierIngredientMap(suppliers, rows);
    expect(map.get(1)).toEqual([]);
  });

  test('연결된 식자재가 없는 공급업체도 빈 배열로 포함된다', () => {
    const map = buildSupplierIngredientMap(suppliers, []);
    expect(map.get(1)).toEqual([]);
    expect(map.get(2)).toEqual([]);
  });

  test('제조사가 비었거나 매칭 업체가 없으면 무시한다', () => {
    const rows = [
      { id: 10, productCode: 'A1', ingredientName: '스팸', manufacturer: '' },
      { id: 11, productCode: 'A2', ingredientName: '백설탕', manufacturer: '전혀다른업체' },
    ];
    const map = buildSupplierIngredientMap(suppliers, rows);
    expect(map.get(1)).toEqual([]);
    expect(map.get(2)).toEqual([]);
  });

  test('잘못된 입력에도 예외 없이 빈 Map을 반환한다', () => {
    expect(buildSupplierIngredientMap(null, null)).toEqual(new Map());
    expect(buildSupplierIngredientMap([], [])).toEqual(new Map());
  });

  test('이름이 표시명·제품명 순으로 폴백된다', () => {
    const rows = [
      { id: 10, productCode: 'A1', manufacturer: 'CJ제일제당', displayName: '표시명' },
      { id: 11, productCode: 'A2', manufacturer: 'CJ제일제당', productName: '제품명' },
    ];
    const map = buildSupplierIngredientMap(suppliers, rows);
    expect(map.get(1).map(r => r.name)).toEqual(['표시명', '제품명']);
  });
});

describe('supplierNameOptions', () => {
  test('중복을 제거하고 localeCompare(ko) 기준으로 정렬한다', () => {
    const suppliers = [
      { id: 1, name: '대림수산' },
      { id: 2, name: 'CJ제일제당' },
      { id: 3, name: '대림수산' },
      { id: 4, name: '' },
    ];
    const result = supplierNameOptions(suppliers);
    expect(result).toHaveLength(2);
    expect(new Set(result)).toEqual(new Set(['CJ제일제당', '대림수산']));
    expect(result).toEqual(['CJ제일제당', '대림수산'].sort((a, b) => a.localeCompare(b, 'ko')));
  });

  test('잘못된 입력에는 빈 배열을 반환한다', () => {
    expect(supplierNameOptions(null)).toEqual([]);
    expect(supplierNameOptions(undefined)).toEqual([]);
  });
});

describe('공급업체 ↔ 제조사 연결이 배선돼 있다', () => {
  const pageSrc = src('app/ingredient/manage/page.jsx');
  const dataHookSrc = src('app/ingredient/manage/useIngredientManageData.js');
  const viewSrc = src('components/cost/ingredient-price/SuppliersView.jsx');
  const listSrc = src('components/cost/ingredient-price/suppliers/SuppliersListPanel.jsx');
  const formSrc = src('app/ingredient/manage/IngredientForm.jsx');
  const basicFieldsSrc = src('app/ingredient/manage/BasicIngredientFields.jsx');

  test('useIngredientManageData가 공급업체 이름 목록을 함께 불러온다', () => {
    expect(dataHookSrc).toContain("import { getAllSuppliers } from '@/lib/cost/suppliers/store'");
    expect(dataHookSrc).toContain(
      "import { supplierNameOptions } from '@/lib/cost/suppliers/link'"
    );
    expect(dataHookSrc).toContain('const supplierNames = supplierNameOptions(suppliers)');
  });

  test('page.jsx가 식자재 행을 공급업체 탭에, 공급업체 이름을 폼에 전달한다', () => {
    expect(pageSrc).toContain('<SuppliersView ingredientRows={rows} />');
    expect(pageSrc).toContain('supplierNames={supplierNames}');
  });

  test('SuppliersView가 ingredientRows로 연결 맵을 계산해 목록에 전달한다', () => {
    expect(viewSrc).toContain('ingredientRows = []');
    expect(viewSrc).toContain(
      "import { buildSupplierIngredientMap } from '@/lib/cost/suppliers/link'"
    );
    expect(viewSrc).toContain('buildSupplierIngredientMap(suppliers, ingredientRows)');
    expect(viewSrc).toContain('linkedMap={linkedMap}');
  });

  test('SuppliersListPanel이 연결 식자재 개수·펼침 목록을 렌더한다', () => {
    expect(listSrc).toContain('연결 식자재');
    expect(listSrc).toContain('function LinkedIngredientsCell');
    expect(listSrc).toContain('linkedMap.get(supplierId)');
  });

  test('제조사 입력칸이 등록된 공급업체 이름으로 자동완성된다', () => {
    expect(basicFieldsSrc).toContain('supplierNames = []');
    expect(basicFieldsSrc).toContain('manufacturerDatalistId');
    expect(basicFieldsSrc).toContain('list={manufacturerDatalistId}');
    expect(formSrc).toContain('supplierNames = []');
    expect(formSrc).toContain('supplierNames={supplierNames}');
  });
});
