import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/ingredient/manage/IngredientForm.jsx'), 'utf8');
const fieldSource = readFileSync(resolve('app/ingredient/manage/IngredientFormFields.jsx'), 'utf8');
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
    expect(fieldSource).toContain('export function IngredientNameField');
    expect(fieldSource).toContain('export function BasicIngredientFields');
    expect(fieldSource).toContain('export function IngredientCostFields');
    expect(fieldSource).toContain('SEED_HASH_TAGS.map');
    expect(fieldSource).toContain('COST_BASE_UNITS.map');
    expect(sectionSource).toContain('export function PhotoSection');
    expect(sectionSource).toContain('export function OriginSection');
    expect(sectionSource).toContain('export function AllergenSection');
    expect(sectionSource).not.toContain('export function BasicIngredientFields');
  });
});
