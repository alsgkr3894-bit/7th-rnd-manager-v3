import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildIngredientQuantities,
  computeGroupCostBySizes,
  createGroupIngredientLine,
  formatGroupTotal,
  formatSubtotal,
  formatUnitPrice,
  getLineSubtotal,
} from '../../components/cost/recipe-groups/editor/groupEditorUtils.js';

const editorSource = readFileSync(resolve('components/cost/recipe-groups/GroupEditor.jsx'), 'utf8');
const headerSource = readFileSync(
  resolve('components/cost/recipe-groups/editor/GroupEditorHeader.jsx'),
  'utf8'
);
const basicFieldsSource = readFileSync(
  resolve('components/cost/recipe-groups/editor/GroupEditorBasicFields.jsx'),
  'utf8'
);
const sizeFieldsSource = readFileSync(
  resolve('components/cost/recipe-groups/editor/GroupEditorSizeFields.jsx'),
  'utf8'
);
const categorySource = readFileSync(
  resolve('components/cost/recipe-groups/editor/GroupEditorCategoryChips.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/cost/recipe-groups/editor/GroupIngredientsTable.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/cost/recipe-groups/editor/groupEditorUtils.js'),
  'utf8'
);

describe('group editor structure', () => {
  test('GroupEditor delegates header, fields, category chips, and ingredients table', () => {
    expect(editorSource).toContain('<GroupEditorHeader');
    expect(editorSource).toContain('<GroupEditorBasicFields');
    expect(editorSource).toContain('<GroupEditorSizeFields');
    expect(editorSource).toContain('<GroupEditorCategoryChips');
    expect(editorSource).toContain('<GroupIngredientsTable');
    expect(editorSource).toContain('<IngredientSearch');
    expect(editorSource).toContain('computeGroupCostBySizes');
    expect(editorSource).not.toContain('<SectionLabel>');
    expect(editorSource).not.toContain('<table');
    expect(editorSource).not.toContain('formatNumber');
    expect(editorSource.split('\n').length).toBeLessThanOrEqual(150);

    expect(headerSource).toContain('export function GroupEditorHeader');
    expect(headerSource).toContain('새 공통묶음 등록');
    expect(basicFieldsSource).toContain('export function GroupEditorBasicFields');
    expect(basicFieldsSource).toContain('묶음 이름 *');
    expect(sizeFieldsSource).toContain('export function GroupEditorSizeFields');
    expect(sizeFieldsSource).toContain('사이즈 레이블');
    expect(categorySource).toContain('export function GroupEditorCategoryChips');
    expect(categorySource).toContain('GROUP_EDITOR_CATEGORIES');
    expect(tableSource).toContain('export function GroupIngredientsTable');
    expect(tableSource).toContain('function GroupIngredientRow');
    expect(tableSource).toContain('합계');
    expect(utilsSource).toContain('export function computeGroupCostBySizes');
  });

  test('helpers keep ingredient defaults, subtotal, total, and display formatting stable', () => {
    const unitPriceMap = new Map([
      ['A', { unitPrice: 2.5, baseUnitType: 'g' }],
      ['B', { unitPrice: 0.75, baseUnitType: '개' }],
    ]);
    const sizeLabels = ['L', 'R'];
    const ingredients = [
      {
        productCode: 'A',
        ingredientName: '치즈',
        quantities: { L: '10', R: '5' },
        unitType: 'g',
      },
      {
        productCode: 'B',
        ingredientName: '소스',
        quantities: { L: '-2', R: '' },
        unitType: '개',
      },
      {
        productCode: 'C',
        ingredientName: '미등록',
        quantities: { L: '999' },
        unitType: 'g',
      },
    ];

    expect(buildIngredientQuantities(sizeLabels)).toEqual({ L: '', R: '' });
    expect(
      createGroupIngredientLine(
        { productCode: 'A', ingredientName: '치즈' },
        unitPriceMap,
        sizeLabels
      )
    ).toEqual({
      productCode: 'A',
      ingredientName: '치즈',
      quantities: { L: '', R: '' },
      unitType: 'g',
    });
    expect(
      createGroupIngredientLine({ productCode: 'C', baseUnitType: '개' }, unitPriceMap, ['L'])
    ).toMatchObject({ productCode: 'C', quantities: { L: '' }, unitType: '개' });
    expect(computeGroupCostBySizes(ingredients, sizeLabels, unitPriceMap)).toEqual({
      L: 23.5,
      R: 12.5,
    });
    expect(getLineSubtotal(ingredients[0], 'L', unitPriceMap)).toBe(25);
    expect(getLineSubtotal(ingredients[1], 'L', unitPriceMap)).toBe(-1.5);
    expect(getLineSubtotal(ingredients[2], 'L', unitPriceMap)).toBeNull();
    expect(formatUnitPrice(0.75)).toBe('0.75원');
    expect(formatUnitPrice(2.5)).toBe('3원');
    expect(formatUnitPrice(null)).toBe('—');
    expect(formatSubtotal(-1.5)).toBe('-2원');
    expect(formatSubtotal(null)).toBe('—');
    expect(formatGroupTotal(23.5)).toBe('24원');
    expect(formatGroupTotal(0)).toBe('—');
  });
});
