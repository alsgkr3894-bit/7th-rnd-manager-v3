import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve('app/menu-sales/upload/page.jsx'), 'utf8');
const uploadHookSource = readFileSync(resolve('lib/sales/use-sales-upload.js'), 'utf8');
const previewSource = readFileSync(resolve('components/sales/UploadPreview.jsx'), 'utf8');
const historySource = readFileSync(resolve('components/sales/UploadHistory.jsx'), 'utf8');

describe('sales upload guard structure', () => {
  test('upload page follows current role before exposing write actions', () => {
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(pageSource).toContain('useSalesUpload({ canEdit })');
    expect(pageSource).toContain('!canEdit || !ready || stage ===');
    expect(pageSource).toContain('canEdit={canEdit}');
  });

  test('sales upload hook refuses file, confirm, and delete writes for viewers', () => {
    expect(uploadHookSource).toContain('useSalesUpload({ canEdit = false } = {})');
    expect(uploadHookSource).toContain('async function handleFile(file, fileError)');
    expect(uploadHookSource).toContain('if (!canEdit) return');
    expect(uploadHookSource).toContain('checkFileExt(file, UPLOAD_EXT.excelOrCsv)');
    expect(uploadHookSource).toContain('checkFileSize(file, UPLOAD_MAX_MB.excel)');
    expect(uploadHookSource.indexOf('checkFileExt(file, UPLOAD_EXT.excelOrCsv)')).toBeLessThan(
      uploadHookSource.indexOf('setError(null)')
    );
    expect(uploadHookSource.indexOf('checkFileSize(file, UPLOAD_MAX_MB.excel)')).toBeLessThan(
      uploadHookSource.indexOf('setError(null)')
    );
    expect(uploadHookSource).toContain('async function handleConfirm()');
    expect(uploadHookSource).toContain('async function handleDeleteFile(fileId, year, month)');
  });

  test('sales upload dropzone uses shared upload policy constants', () => {
    const dropzoneSource = readFileSync(resolve('components/sales/UploadDropzone.jsx'), 'utf8');
    expect(dropzoneSource).toContain('UPLOAD_EXT');
    expect(dropzoneSource).toContain('UPLOAD_MAX_MB');
    expect(dropzoneSource).toContain('accept={UPLOAD_EXT.excelOrCsv}');
    expect(dropzoneSource).toContain('maxSizeMB={UPLOAD_MAX_MB.excel}');
  });

  test('preview and history buttons are disabled unless the user can edit', () => {
    expect(previewSource).toContain('canEdit = false');
    expect(previewSource).toContain('disabled={saving || !canEdit}');
    expect(historySource).toContain('canEdit = false');
    expect(historySource).toContain('if (!canEdit || !handleDeleteFile) return');
    expect(historySource).toContain('canEdit && handleDeleteFile && f.id != null');
  });

  test('upload preview and history expose saved revenue totals', () => {
    expect(uploadHookSource).toContain('totalRevenue');
    expect(uploadHookSource).toContain('safeRevenue(row?.revenue)');
    expect(uploadHookSource).toContain('headerColumns: result.headerColumns');
    expect(uploadHookSource).toContain('revenueSummary: result.revenueSummary');
    expect(uploadHookSource).toContain('revenueWarningRows: result.revenueWarningRows');
    expect(pageSource).toContain('headerColumns={safePreview.headerColumns}');
    expect(pageSource).toContain('revenueSummary={safePreview.revenueSummary}');
    expect(pageSource).toContain('revenueWarningRows={safePreview.revenueWarningRows}');
    expect(previewSource).toContain('totalRevenue');
    expect(previewSource).toContain('safeRevenue(r.revenue)');
    expect(previewSource).toContain('매출액');
    expect(previewSource).toContain('금액 컬럼 인식');
    expect(previewSource).toContain('금액 없이 판매량만 반영됩니다');
    expect(historySource).toContain('safeRevenue(f.totalRevenue)');
    expect(historySource).toContain('매출액');
  });
});
