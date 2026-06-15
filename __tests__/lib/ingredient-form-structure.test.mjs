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
    expect(costFieldSource).toContain('COST_BASE_UNITS.map');
    expect(costFieldSource).toContain('const TEMP_OPTIONS = [');
    expect(sectionSource).toContain('export function PhotoSection');
    expect(sectionSource).toContain('export function OriginSection');
    expect(sectionSource).toContain('export function AllergenSection');
    expect(sectionSource).not.toContain('export function BasicIngredientFields');
  });
});
