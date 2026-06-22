import { readFileSync } from 'fs';
import { resolve } from 'path';

const modalSource = readFileSync(resolve('components/nutrition/menu/ImportBaseModal.jsx'), 'utf8');
const uploadStepSource = readFileSync(
  resolve('components/nutrition/menu/import-base/ImportBaseUploadStep.jsx'),
  'utf8'
);
const summaryBarSource = readFileSync(
  resolve('components/nutrition/menu/import-base/ImportBaseSummaryBar.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/nutrition/menu/import-base/ImportBasePreviewTable.jsx'),
  'utf8'
);
const rowSource = readFileSync(
  resolve('components/nutrition/menu/import-base/ImportBaseRow.jsx'),
  'utf8'
);
const rowHelpersSource = readFileSync(
  resolve('components/nutrition/menu/import-base/importBaseRows.js'),
  'utf8'
);

describe('nutrition import base modal structure', () => {
  test('ImportBaseModal keeps import/save state and delegates upload and preview UI', () => {
    expect(modalSource).toContain('export function ImportBaseModal');
    expect(modalSource).toContain('parseLabExcel');
    expect(modalSource).toContain('buildImportRows');
    expect(modalSource).toContain('bulkUpsertBaseData');
    expect(modalSource).toContain('bulkUpsertBaseData(payload)');
    expect(modalSource).not.toContain('for (const row of toSave)');
    expect(modalSource).not.toContain('부분 저장됨');
    expect(modalSource).toContain('<ImportBaseUploadStep');
    expect(modalSource).toContain('<ImportBaseSummaryBar');
    expect(modalSource).toContain('<ImportBasePreviewTable');
    expect(modalSource).not.toContain('function ImportRow');
    expect(modalSource).not.toContain('MenuCodePicker');
    expect(modalSource).not.toContain('UploadDropzone');
  });

  test('upload, summary, table, row, and row helper responsibilities stay separated', () => {
    expect(uploadStepSource).toContain('export function ImportBaseUploadStep');
    expect(uploadStepSource).toContain('UploadDropzone');
    expect(uploadStepSource).toContain('베이스 영양성분 엑셀 가져오기');
    expect(summaryBarSource).toContain('export function ImportBaseSummaryBar');
    expect(summaryBarSource).toContain('전체선택');
    expect(summaryBarSource).toContain('전체해제');
    expect(tableSource).toContain('export function ImportBasePreviewTable');
    expect(tableSource).toContain('<ImportBaseRow');
    expect(tableSource).toContain('원본명');
    expect(rowSource).toContain('export function ImportBaseRow');
    expect(rowSource).toContain('MenuCodePicker');
    expect(rowSource).toContain('StatusBadge');
    expect(rowSource).toContain('FmtNum');
    expect(rowHelpersSource).toContain('export function categoryForImportRow');
    expect(rowHelpersSource).toContain('NUTRITION_CATEGORY_OPTIONS');
    expect(rowHelpersSource).toContain('CRUST_TYPES');
    expect(rowHelpersSource).not.toContain('MenuCodePicker');
  });
});
