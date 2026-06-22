import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildInitialRegisterForm,
  buildRegisterCategoryOptions,
  buildRegisterPayload,
  buildRegisterPriceChangePayload,
  validateRegisterForm,
} from '../../components/cost/ingredient-price/register-modal/registerModalUtils.js';

const modalSource = readFileSync(
  resolve('components/cost/ingredient-price/RegisterModal.jsx'),
  'utf8'
);
const controllerSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/useRegisterModalController.js'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/registerModalUtils.js'),
  'utf8'
);
const primitiveSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/RegisterModalPrimitives.jsx'),
  'utf8'
);
const infoSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/RegisterModalInfoPanel.jsx'),
  'utf8'
);
const basicSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/RegisterModalBasicFields.jsx'),
  'utf8'
);
const costSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/RegisterModalCostFields.jsx'),
  'utf8'
);
const actionsSource = readFileSync(
  resolve('components/cost/ingredient-price/register-modal/RegisterModalActions.jsx'),
  'utf8'
);
const silentCatchPolicySource = readFileSync(
  resolve('__tests__/lib/silent-catch-policy.test.mjs'),
  'utf8'
);

describe('register modal helpers', () => {
  test('buildInitialRegisterForm preserves existing values and flags custom categories', () => {
    const categoryOptions = buildRegisterCategoryOptions(['커스텀분류']);
    const form = buildInitialRegisterForm(
      {
        productName: '제때 제품',
        meta: {
          ingredientName: '마스터명',
          category: '새 직접분류',
          baseQuantity: 1000,
          baseUnitType: 'g',
          supplierId: 7,
          supplierName: '공급업체',
          priceOverride: 5000,
        },
      },
      categoryOptions
    );

    expect(categoryOptions).toContain('커스텀분류');
    expect(form).toMatchObject({
      ingredientName: '마스터명',
      category: '새 직접분류',
      baseQuantity: '1000',
      baseUnitType: 'g',
      customCat: true,
      supplierId: 7,
      supplierName: '공급업체',
      priceOverride: '5000',
    });
  });

  test('validateRegisterForm and payload builders normalize numeric fields', () => {
    const invalid = validateRegisterForm({ baseQuantity: '-1', priceOverride: 'abc' });
    expect(invalid.errors).toEqual({
      baseQuantity: '포장수량은 0 이상 숫자만 입력하세요',
      priceOverride: '단가는 0 이상 숫자만 입력하세요',
    });

    const form = {
      ingredientName: '  ',
      category: ' 토핑 ',
      baseUnitType: '개',
      supplierId: '',
      supplierName: '',
      baseQuantity: '20',
      priceOverride: '',
    };
    const validated = validateRegisterForm(form);
    expect(validated.errors).toEqual({});
    expect(buildRegisterPayload({ row: { productName: '제때명' }, form, validated })).toEqual({
      ingredientName: '제때명',
      category: '토핑',
      baseQuantity: 20,
      baseUnitType: '개',
      taxType: '과세',
      supplierId: null,
      supplierName: null,
      priceOverride: null,
    });
  });

  test('price history payload keeps register source and fallback product code', () => {
    const payload = buildRegisterPriceChangePayload({
      existing: { id: 9, productCode: null, priceOverride: 3000 },
      row: { productCode: 'P001', productName: '제품' },
      form: { ingredientName: '', priceOverride: '4000' },
      newPriceOverride: 4000,
    });

    expect(payload).toEqual({
      ingredientId: 9,
      productCode: 'P001',
      ingredientName: '제품',
      oldPrice: 3000,
      newPrice: 4000,
      source: 'register',
    });
  });
});

describe('register modal structure', () => {
  test('RegisterModal delegates controller, info panel, fields, and actions', () => {
    expect(modalSource).toContain('export function RegisterModal');
    expect(modalSource).toContain('useRegisterModalController({ row, onSave, extraCategories })');
    expect(modalSource).toContain('<RegisterModalInfoPanel');
    expect(modalSource).toContain('<RegisterModalBasicFields');
    expect(modalSource).toContain('<RegisterModalCostFields');
    expect(modalSource).toContain('<RegisterModalActions');
    expect(modalSource).not.toContain('getAllSuppliers');
    expect(modalSource).not.toContain('recordPriceChange');
    expect(modalSource).not.toContain('parseOptionalNonNegativeNumber');
    expect(modalSource).not.toContain('COST_BASE_UNITS.map');
    expect(modalSource).not.toContain('catOptions.map');
  });

  test('extracted files own controller and presentation responsibilities', () => {
    expect(controllerSource).toContain('export function useRegisterModalController');
    expect(controllerSource).toContain('getAllSuppliers()');
    expect(controllerSource).not.toContain('recordPriceChange');
    expect(controllerSource).toContain("console.warn('[RegisterModal] 공급업체 목록 로드 실패:'");
    expect(controllerSource).toContain("from '@/hooks/useMounted'");
    expect(controllerSource).toContain('if (mountedRef.current) setSaving(false);');
    expect(utilsSource).toContain('export function buildRegisterCategoryOptions');
    expect(utilsSource).toContain('export function validateRegisterForm');
    expect(utilsSource).toContain('export function buildRegisterPayload');
    expect(primitiveSource).toContain('export function InfoRow');
    expect(primitiveSource).toContain('export function FormField');
    expect(primitiveSource).toContain('export function FieldError');
    expect(infoSource).toContain('export function RegisterModalInfoPanel');
    expect(infoSource).toContain('formatNumber(row.priceWithTax)');
    expect(basicSource).toContain('export function RegisterModalBasicFields');
    expect(basicSource).toContain('categoryOptions.map');
    expect(basicSource).toContain('직접 입력');
    expect(costSource).toContain('export function RegisterModalCostFields');
    expect(costSource).toContain('COST_BASE_UNITS.map');
    expect(costSource).toContain('suppliers.map');
    expect(costSource).toContain('errors.priceOverride');
    expect(actionsSource).toContain('export function RegisterModalActions');
    expect(actionsSource).toContain("saving ? '저장 중…' : existing ? '수정' : '등록'");
  });

  test('RegisterModal no longer needs silent catch allowlist entries', () => {
    expect(silentCatchPolicySource).not.toContain(
      "file: 'components/cost/ingredient-price/RegisterModal.jsx'"
    );
  });
});
