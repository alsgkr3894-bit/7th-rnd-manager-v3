import { readFileSync } from 'fs';
import { resolve } from 'path';

const modalSource = readFileSync(resolve('components/cost/edge-dough/EdgeEditModal.jsx'), 'utf8');
const identitySource = readFileSync(
  resolve('components/cost/edge-dough/EdgeIdentityFields.jsx'),
  'utf8'
);
const componentsSectionSource = readFileSync(
  resolve('components/cost/edge-dough/EdgeComponentsSection.jsx'),
  'utf8'
);
const componentRowSource = readFileSync(
  resolve('components/cost/edge-dough/EdgeComponentRow.jsx'),
  'utf8'
);
const noteFieldSource = readFileSync(
  resolve('components/cost/edge-dough/EdgeNoteField.jsx'),
  'utf8'
);
const marginSettingsSource = readFileSync(
  resolve('components/cost/edge-dough/EdgeMarginSettings.jsx'),
  'utf8'
);
const totalSummarySource = readFileSync(
  resolve('components/cost/edge-dough/EdgeTotalSummary.jsx'),
  'utf8'
);
const edgeStoreSource = readFileSync(resolve('lib/cost/edge-dough/store.js'), 'utf8');

describe('edge edit modal structure', () => {
  test('EdgeEditModal keeps load/save state and delegates visible form sections', () => {
    expect(modalSource).toContain('export function EdgeEditModal');
    expect(modalSource).toContain('getPriceRowsByFileId');
    expect(modalSource).toContain('normalizeComponents');
    expect(modalSource).toContain('normalizeMarginSuffix');
    expect(modalSource).toContain("parseOptionalNonNegativeNumber, parseOptionalNumber");
    expect(modalSource).toContain('const quantity = parseOptionalNumber(c.quantity)');
    expect(modalSource).toContain('구성품 수량은 숫자만 입력하세요');
    expect(modalSource).toContain('const unitPrice = parseOptionalNonNegativeNumber(c.unitPrice)');
    expect(modalSource).toContain('edgeCodeOf(edgeType, size)');
    expect(modalSource).toContain("from '@/hooks/useMounted'");
    expect(modalSource).toContain('const mountedRef = useMounted();');
    expect(modalSource).toContain('let alive = true;');
    expect(modalSource).toContain('if (!alive) return;');
    expect(modalSource).toContain('if (mountedRef.current) setSaving(false);');
    expect(modalSource).toContain('<EdgeIdentityFields');
    expect(modalSource).toContain('<EdgeComponentsSection');
    expect(modalSource).toContain('<EdgeNoteField');
    expect(modalSource).toContain('<EdgeMarginSettings');
    expect(modalSource).toContain('<EdgeTotalSummary');
    expect(modalSource).not.toContain('function CompRow');
    expect(modalSource).not.toContain('IngredientSearch');
    expect(modalSource).not.toContain('UNIT_OPTIONS.map');
  });

  test('edge edit child components keep separate responsibilities', () => {
    expect(identitySource).toContain('export function EdgeIdentityFields');
    expect(identitySource).toContain('EDGE_TYPES.map');
    expect(identitySource).toContain("edgeType === '씬도우'");
    expect(componentsSectionSource).toContain('export function EdgeComponentsSection');
    expect(componentsSectionSource).toContain('<EdgeComponentRow');
    expect(componentsSectionSource).toContain('구성품을 추가해주세요');
    expect(componentRowSource).toContain('export function EdgeComponentRow');
    expect(componentRowSource).toContain('IngredientSearch');
    expect(componentRowSource).toContain('UNIT_OPTIONS.map');
    expect(componentRowSource).toContain('data-comp-row="1"');
    expect(noteFieldSource).toContain('export function EdgeNoteField');
    expect(noteFieldSource).toContain('FieldLabel>비고');
    expect(marginSettingsSource).toContain('export function EdgeMarginSettings');
    expect(marginSettingsSource).toContain('defaultMarginSuffix');
    expect(marginSettingsSource).toContain('원가마진표에 별도 행으로 표시');
    expect(marginSettingsSource).not.toContain('textTransform');
    expect(totalSummarySource).toContain('export function EdgeTotalSummary');
    expect(totalSummarySource).toContain('formatNumber(total)');
    expect(edgeStoreSource).toContain('allowNegativeQuantity: true');
    expect(edgeStoreSource).toContain('normalizeMarginSuffix');
  });
});
