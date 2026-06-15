import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/nutrition/allergen/page.jsx'), 'utf8');
const ingredientTableSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenIngredientTable.jsx'),
  'utf8'
);
const matrixTableSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenMenuMatrixTable.jsx'),
  'utf8'
);
const detailModalSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenDetailModal.jsx'),
  'utf8'
);

describe('nutrition allergen page structure', () => {
  test('page delegates ingredient table, matrix table, and detail modal rendering', () => {
    expect(pageSource).toContain('<AllergenIngredientTable');
    expect(pageSource).toContain('<AllergenMenuMatrixTable');
    expect(pageSource).toContain('<AllergenDetailModal');
    expect(pageSource).not.toContain('getMenusForIngredient');
    expect(pageSource).not.toContain('title="식자재 알레르기 상세 보기"');
    expect(pageSource).not.toContain('<ModalFrame');
  });

  test('extracted components own their focused rendering responsibilities', () => {
    expect(ingredientTableSource).toContain('export function AllergenIngredientTable');
    expect(ingredientTableSource).toContain('getMenusForIngredient');
    expect(ingredientTableSource).toContain('알레르기 등록 식자재가 없어요');
    expect(matrixTableSource).toContain('export function AllergenMenuMatrixTable');
    expect(matrixTableSource).toContain('title="식자재 알레르기 상세 보기"');
    expect(matrixTableSource).toContain('표시할 메뉴가 없어요');
    expect(detailModalSource).toContain('export function AllergenDetailModal');
    expect(detailModalSource).toContain('<ModalFrame');
    expect(detailModalSource).toContain('상세 식자재가 없습니다');
  });
});
