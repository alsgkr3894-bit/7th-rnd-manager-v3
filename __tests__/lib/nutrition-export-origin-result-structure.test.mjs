import { readFileSync } from 'fs';
import { resolve } from 'path';

const resultSource = readFileSync(resolve('app/nutrition/export/OriginResult.jsx'), 'utf8');
const controlsSource = readFileSync(
  resolve('app/nutrition/export/OriginResultControls.jsx'),
  'utf8'
);
const commonControlsSource = readFileSync(
  resolve('app/nutrition/export/ExportResultControls.jsx'),
  'utf8'
);
const tablesSource = readFileSync(resolve('app/nutrition/export/OriginResultTables.jsx'), 'utf8');
const sheetsSource = readFileSync(resolve('lib/nutrition/origin/output-sheets.js'), 'utf8');

describe('nutrition export origin result structure', () => {
  test('OriginResult keeps origin data transformation and delegates presentation', () => {
    expect(resultSource).toContain('<OriginResultTopTabs');
    expect(resultSource).toContain('<OriginResultSubTabs');
    expect(resultSource).toContain('<OriginResultActions');
    expect(resultSource).toContain('<OriginResultSheetContent');
    expect(resultSource).toContain('buildOriginsFromIngredients');
    expect(resultSource).toContain('buildOriginStoreSheet(origins');
    expect(resultSource).toContain('exportOriginToExcel');
    expect(resultSource).toContain('printOriginAll');
    expect(resultSource).not.toContain('function normalizeOriginItems');
    expect(resultSource).not.toContain('function buildSheet1');
    expect(resultSource).not.toContain('function buildSheet2');
    expect(resultSource).not.toContain('function buildSheet3');
    expect(resultSource).not.toContain('function buildSheet4');
    expect(resultSource).not.toContain('const SUB_TABS');
    expect(resultSource).not.toContain('function Sheet1');
    expect(resultSource).not.toContain('function Sheet2');
    expect(resultSource).not.toContain('function Sheet3');
    expect(resultSource).not.toContain('function Sheet4');
    expect(resultSource).not.toContain('origin-result-actions');
  });

  test('origin result controls and tables own output UI details', () => {
    expect(controlsSource).toContain('export const ORIGIN_RESULT_TABS');
    expect(controlsSource).toContain('export function OriginResultTopTabs');
    expect(controlsSource).toContain('export function OriginResultSubTabs');
    expect(controlsSource).toContain('export function OriginResultActions');
    expect(controlsSource).toContain('<ExportResultLoading');
    expect(controlsSource).toContain('<ExportResultTabs');
    expect(controlsSource).toContain('<ExportResultActions');
    expect(controlsSource).toContain('식자재명 편집');
    expect(commonControlsSource).toContain('export function ExportResultLoading');
    expect(commonControlsSource).toContain('export function ExportResultTabs');
    expect(commonControlsSource).toContain('export function ExportResultActions');
    expect(tablesSource).toContain('export function OriginResultSheetContent');
    expect(tablesSource).toContain('function Sheet1');
    expect(tablesSource).toContain('function Sheet2');
    expect(tablesSource).toContain('function Sheet3');
    expect(tablesSource).toContain('function Sheet4');
    expect(tablesSource).toContain('원산지 표시판 (매장비치용)');
    expect(tablesSource).toContain('원산지 정보');
    expect(sheetsSource).toContain('export function buildOriginStoreSheet');
    expect(sheetsSource).toContain('export function buildOriginFridgeSheet');
    expect(sheetsSource).toContain('export function buildOriginDeliverySheet');
    expect(sheetsSource).toContain('export function buildOriginStatementSheet');
  });
});
