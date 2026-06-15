import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/ingredient/manage/IngredientForm.jsx'), 'utf8');
const fieldSource = readFileSync(resolve('app/ingredient/manage/IngredientFormFields.jsx'), 'utf8');
const nameFieldSource = readFileSync(
  resolve('app/ingredient/manage/IngredientNameField.jsx'),
  'utf8'
);
const basicFieldSource = readFileSync(
  resolve('app/ingredient/manage/BasicIngredientFields.jsx'),
  'utf8'
);
const costFieldSource = readFileSync(
  resolve('app/ingredient/manage/IngredientCostFields.jsx'),
  'utf8'
);
const packageFieldSource = readFileSync(
  resolve('app/ingredient/manage/IngredientPackageQuantityField.jsx'),
  'utf8'
);
const manualCostFieldSource = readFileSync(
  resolve('app/ingredient/manage/IngredientManualCostFields.jsx'),
  'utf8'
);
const scopeNoteFieldSource = readFileSync(
  resolve('app/ingredient/manage/IngredientScopeNoteFields.jsx'),
  'utf8'
);
const radioOptionSource = readFileSync(
  resolve('app/ingredient/manage/IngredientRadioOption.jsx'),
  'utf8'
);
const sectionSource = readFileSync(
  resolve('app/ingredient/manage/IngredientFormSections.jsx'),
  'utf8'
);

describe('ingredient form structure', () => {
  test('IngredientForm delegates basic and cost inputs to field components', () => {
    expect(formSource).toContain("from './IngredientFormFields'");
    expect(formSource).toContain('<IngredientNameField');
    expect(formSource).toContain('<BasicIngredientFields');
    expect(formSource).toContain('<IngredientCostFields');
    expect(formSource).not.toContain('const TEMP_OPTIONS = [');
    expect(formSource).not.toContain('SEED_HASH_TAGS.map');
    expect(formSource).not.toContain('COST_BASE_UNITS.map');
  });

  test('field and section components keep their responsibilities separated', () => {
    expect(fieldSource).toContain("export { IngredientNameField } from './IngredientNameField'");
    expect(fieldSource).toContain(
      "export { BasicIngredientFields } from './BasicIngredientFields'"
    );
    expect(fieldSource).toContain("export { IngredientCostFields } from './IngredientCostFields'");
    expect(fieldSource).not.toContain('export function');
    expect(fieldSource).not.toContain('SEED_HASH_TAGS.map');
    expect(fieldSource).not.toContain('COST_BASE_UNITS.map');
    expect(nameFieldSource).toContain('export function IngredientNameField');
    expect(nameFieldSource).toContain('label="재료명"');
    expect(basicFieldSource).toContain('export function BasicIngredientFields');
    expect(basicFieldSource).toContain('SEED_HASH_TAGS.map');
    expect(basicFieldSource).toContain('label="#태그"');
    expect(costFieldSource).toContain('export function IngredientCostFields');
    expect(costFieldSource).toContain('<IngredientPackageQuantityField');
    expect(costFieldSource).toContain('<IngredientManualCostFields');
    expect(costFieldSource).toContain('<IngredientScopeNoteFields');
    expect(costFieldSource).not.toContain('COST_BASE_UNITS.map');
    expect(costFieldSource).not.toContain('const TEMP_OPTIONS = [');
    expect(costFieldSource).not.toContain('SCOPE_ORDER.map');
    expect(packageFieldSource).toContain('export function IngredientPackageQuantityField');
    expect(packageFieldSource).toContain('COST_BASE_UNITS.map');
    expect(packageFieldSource).toContain('label="포장수량"');
    expect(manualCostFieldSource).toContain('export function IngredientManualCostFields');
    expect(manualCostFieldSource).toContain('const TEMP_OPTIONS = [');
    expect(manualCostFieldSource).toContain('const TAX_OPTIONS = [');
    expect(manualCostFieldSource).toContain('label="수동 단가 (부가세포함)"');
    expect(manualCostFieldSource).toContain('<IngredientRadioOption');
    expect(scopeNoteFieldSource).toContain('export function IngredientScopeNoteFields');
    expect(scopeNoteFieldSource).toContain('SCOPE_ORDER.map');
    expect(scopeNoteFieldSource).toContain('SCOPE_UNASSIGNED');
    expect(scopeNoteFieldSource).toContain('label="전용/범용"');
    expect(scopeNoteFieldSource).toContain('label="비고"');
    expect(scopeNoteFieldSource).toContain('<IngredientRadioOption');
    expect(radioOptionSource).toContain('export function IngredientRadioOption');
    expect(radioOptionSource).toContain('type="radio"');
    expect(radioOptionSource).toContain('accentColor');
    expect(sectionSource).toContain('export function PhotoSection');
    expect(sectionSource).toContain('export function OriginSection');
    expect(sectionSource).toContain('export function AllergenSection');
    expect(sectionSource).not.toContain('export function BasicIngredientFields');
  });
});
