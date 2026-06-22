import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  amountText,
  buildIngredientMetaByCode,
  buildIngredientOptions,
  buildMenuByCode,
  filterDerivedCompositions,
  groupDerivedCompositions,
} from '../../components/nutrition/menu/derived/derivedCompositionUtils.js';

const tabSource = readFileSync(resolve('components/nutrition/menu/TabDerived.jsx'), 'utf8');
const listSource = readFileSync(
  resolve('components/nutrition/menu/derived/DerivedCompositionList.jsx'),
  'utf8'
);
const modalSource = readFileSync(
  resolve('components/nutrition/menu/derived/DerivedCompositionModal.jsx'),
  'utf8'
);
const hookSource = readFileSync(resolve('hooks/useDerivedCompositionForm.js'), 'utf8');
const amountRowsSource = readFileSync(
  resolve('components/nutrition/menu/derived/DerivedIngredientAmountRows.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/nutrition/menu/derived/derivedCompositionUtils.js'),
  'utf8'
);

describe('nutrition derived tab structure', () => {
  test('TabDerived delegates list, modal, amount rows, and pure derived helpers', () => {
    expect(tabSource).toContain('<DerivedCompositionList');
    expect(tabSource).toContain('<DerivedCompositionModal');
    expect(tabSource).toContain('filterDerivedCompositions');
    expect(tabSource).toContain('groupDerivedCompositions');
    expect(tabSource).toContain('useDerivedCompositionForm');
    expect(tabSource).not.toContain('<ModalFrame');
    expect(tabSource).not.toContain('<IngredientSearch');
    expect(tabSource).not.toContain('function amountText');
    expect(tabSource).not.toContain('파생 메뉴가 없어요');

    expect(listSource).toContain('export function DerivedCompositionList');
    expect(listSource).toContain('function DerivedCompositionCard');
    expect(listSource).toContain('파생 메뉴가 없어요');
    expect(listSource).toContain('amountText');
    expect(modalSource).toContain('export function DerivedCompositionModal');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('<IngredientSearch');
    expect(modalSource).toContain('<DerivedIngredientAmountRows');
    expect(amountRowsSource).toContain('export function DerivedIngredientAmountRows');
    expect(amountRowsSource).toContain('L/R 식자재 사용량');
    expect(utilsSource).toContain('export function filterDerivedCompositions');
    expect(utilsSource).toContain('export function groupDerivedCompositions');
  });

  test('derived composition write controls follow canEdit role state', () => {
    expect(tabSource).toContain('canEdit = false');
    expect(tabSource).toContain('useDerivedCompositionForm({ onRefresh: refresh, canEdit })');
    expect(tabSource).toContain('canEdit && (');
    expect(listSource).toContain('canEdit = false');
    expect(listSource).toContain('disabled={!canEdit}');
    expect(hookSource).toContain('canEdit = false');
    expect(hookSource).toContain('if (!canEdit) return');
  });

  test('derived helpers keep search, ingredient labels, and grouping behavior stable', () => {
    const menus = [
      { menuCode: 'PZ-BASE', menuName: '베이스 피자', category: '피자' },
      { menuCode: 'SD-BASE', menuName: '사이드 메뉴', category: '사이드' },
    ];
    const ingredients = [
      { productCode: 'ING-MAYO', ingredientName: '마요네즈' },
      { productCode: 'ING-CHEESE', productName: '치즈' },
      { productCode: 'ING-CHEESE', ingredientName: '체다치즈' },
      { productCode: '', ingredientName: '무시' },
    ];
    const compositions = [
      {
        menuCode: 'PZ-DERIVED',
        menuName: '컨츄리마요',
        baseMenuCode: 'PZ-BASE',
        ingredientCodes: ['ING-MAYO'],
        ingredientAmounts: { 'ING-MAYO': { L: 10, R: 8 } },
      },
      {
        menuCode: 'SD-DERIVED',
        menuName: '사이드파생',
        baseMenuCode: 'SD-BASE',
        ingredientCodes: ['ING-CHEESE'],
      },
    ];

    const menuByCode = buildMenuByCode(menus);
    const ingredientMetaByCode = buildIngredientMetaByCode(ingredients);
    const ingredientOptions = buildIngredientOptions(ingredients);

    expect(ingredientOptions.map(row => row.ingredientName)).toEqual(['마요네즈', '체다치즈']);
    expect(amountText(compositions[0].ingredientAmounts, 'ING-MAYO')).toBe('L 10g / R 8g');
    expect(
      filterDerivedCompositions({
        compositions,
        searchText: '마요',
        menuByCode,
        ingredientMetaByCode,
      }).map(row => row.menuCode)
    ).toEqual(['PZ-DERIVED']);
    expect(
      filterDerivedCompositions({
        compositions,
        searchText: '사이드 메뉴',
        menuByCode,
        ingredientMetaByCode,
      }).map(row => row.menuCode)
    ).toEqual(['SD-DERIVED']);
    expect(
      groupDerivedCompositions({
        compositions,
        menuByCode,
        masterByCode: Object.fromEntries(menus.map(menu => [menu.menuCode, menu])),
      }).map(group => [group.group, group.items.map(row => row.menuCode)])
    ).toEqual([
      ['피자', ['PZ-DERIVED']],
      ['사이드', ['SD-DERIVED']],
    ]);
  });
});
