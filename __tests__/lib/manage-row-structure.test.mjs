import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rowSource = readFileSync(resolve('components/ingredient/ManageRow.jsx'), 'utf8');
const utilsSource = readFileSync(
  resolve('components/ingredient/manage-row/manageRowUtils.js'),
  'utf8'
);
const selectionSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowSelectionCell.jsx'),
  'utf8'
);
const codeSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowCodeCell.jsx'),
  'utf8'
);
const photoSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowPhotoCell.jsx'),
  'utf8'
);
const nameSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowNameCell.jsx'),
  'utf8'
);
const scopeSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowScopeCell.jsx'),
  'utf8'
);
const priceSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowPriceCell.jsx'),
  'utf8'
);
const categorySource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowCategoryCell.jsx'),
  'utf8'
);
const tagsSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowTagsCell.jsx'),
  'utf8'
);
const actionSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowActionCell.jsx'),
  'utf8'
);

describe('ingredient manage row structure', () => {
  test('ManageRow delegates row cell rendering to focused components', () => {
    expect(rowSource).toContain('export const ManageRow');
    expect(rowSource).toContain('buildManageRowModel(rawRow)');
    expect(rowSource).toContain('<ManageRowSelectionCell');
    expect(rowSource).toContain('<ManageRowCodeCell');
    expect(rowSource).toContain('<ManageRowPhotoCell');
    expect(rowSource).toContain('<ManageRowNameCell');
    expect(rowSource).toContain('<ManageRowScopeCell');
    expect(rowSource).toContain('<ManageRowPriceCell');
    expect(rowSource).toContain('<ManageRowCategoryCell');
    expect(rowSource).toContain('<ManageRowTagsCell');
    expect(rowSource).toContain('<ManageRowActionCell');
    expect(rowSource).not.toContain('getPrimaryIngredientPhoto');
    expect(rowSource).not.toContain('sortHashTags');
    expect(rowSource).not.toContain('getCategoryStyle');
    expect(rowSource).not.toContain('SCOPE_STYLES');
    expect(rowSource).not.toContain('Icon.copy');
    expect(rowSource).not.toContain('Icon.trash');
  });

  test('row view model owns display normalization and destructive action rules', () => {
    expect(utilsSource).toContain('export function buildManageRowModel');
    expect(utilsSource).toContain('sortHashTags(asStringArray(r.tags))');
    expect(utilsSource).toContain('getPrimaryIngredientPhoto(r)');
    expect(utilsSource).toContain('countIngredientPhotos(r)');
    expect(utilsSource).toContain('deletable: r.isManual && r.id != null && !productCode');
  });

  test('extracted cells keep table interactions and display details separated', () => {
    expect(selectionSource).toContain('export function ManageRowSelectionCell');
    expect(selectionSource).toContain('event.stopPropagation()');
    expect(selectionSource).toContain('제때 연동 항목은 일괄 삭제 대상이 아니에요');
    expect(codeSource).toContain('export function ManageRowCodeCell');
    expect(codeSource).toContain("jetteLinked ? '연동' : '수동'");
    expect(photoSource).toContain('export function ManageRowPhotoCell');
    expect(photoSource).toContain('photoCount > 1');
    expect(nameSource).toContain('export function ManageRowNameCell');
    expect(nameSource).toContain('IngredientStatusBadge');
    expect(nameSource).toContain('알레르기');
    expect(scopeSource).toContain('SCOPE_STYLES');
    expect(priceSource).toContain('formatNumber(priceWithTax)');
    expect(categorySource).toContain('getCategoryStyle(category)');
    expect(categorySource).toContain('미분류');
    expect(tagsSource).toContain('tags.map');
    expect(actionSource).toContain('event.stopPropagation()');
    expect(actionSource).toContain('Icon.copy');
    expect(actionSource).toContain('Icon.trash');
    expect(actionSource).toContain('복사해서 추가');
    expect(actionSource).toContain("isManual && !productCode ? '삭제' : '숨김'");
  });
});
