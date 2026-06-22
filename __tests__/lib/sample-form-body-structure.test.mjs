import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/note/sample/_SampleFormBody.jsx'), 'utf8');
const basicSource = readFileSync(resolve('app/note/sample/_SampleBasicInfoCard.jsx'), 'utf8');
const detailSource = readFileSync(resolve('app/note/sample/_SampleDetailRecordCard.jsx'), 'utf8');
const linkedSource = readFileSync(resolve('app/note/sample/_SampleLinkedProductsCard.jsx'), 'utf8');
const photoSource = readFileSync(resolve('app/note/sample/_SamplePhotoCard.jsx'), 'utf8');

describe('sample form body structure', () => {
  test('form body keeps data wiring while delegating card rendering', () => {
    expect(formSource).toContain('readOnly = false');
    expect(formSource).toContain('if (readOnly) return');
    expect(formSource).toContain('readOnly={readOnly}');
    expect(formSource).toContain('<SampleBasicInfoCard');
    expect(formSource).toContain('<SampleDetailRecordCard');
    expect(formSource).toContain('<SampleLinkedProductsCard');
    expect(formSource).toContain('<SamplePhotoCard');
    expect(formSource).toContain('let alive = true;');
    expect(formSource).toContain('if (!alive) return;');
    expect(formSource).toContain('alive = false;');
    expect(formSource).toContain('handleFiles');
    expect(formSource).toContain('clearProductSearchSoon');
    expect(formSource).not.toContain('function StarPicker');
    expect(formSource).not.toContain('function LinkedProductsCard');
    expect(formSource).not.toContain('<TagInput');
    expect(formSource).not.toContain('<ComboBox');
    expect(formSource).not.toContain('className="star-rate-btn"');
  });

  test('extracted cards own their focused form sections', () => {
    expect(basicSource).toContain('export function SampleBasicInfoCard');
    expect(basicSource).toContain('function StarPicker');
    expect(basicSource).toContain('<ComboBox');
    expect(basicSource).toContain('<SegGroup');
    expect(basicSource).toContain('disabled={readOnly}');
    expect(detailSource).toContain('export function SampleDetailRecordCard');
    expect(detailSource).toContain('<TagInput');
    expect(detailSource).toContain('disabled={readOnly}');
    expect(linkedSource).toContain('export function SampleLinkedProductsCard');
    expect(linkedSource).toContain('식자재명 또는 메뉴명 검색');
    expect(linkedSource).toContain('disabled={readOnly}');
    expect(photoSource).toContain('export function SamplePhotoCard');
    expect(photoSource).toContain('onCaptionChange');
    expect(photoSource).toContain('fileInputRef.current?.click()');
    expect(photoSource).toContain('!readOnly && photos.length < maxPhotos');
  });

  test('sample photo upload keeps read-only, type, and size guards before resize', () => {
    expect(formSource).toContain('if (readOnly) return;');
    expect(formSource).toContain('allFiles.filter(isSupportedImageFile)');
    expect(formSource).toContain('checkFileSize(file, UPLOAD_MAX_MB.photo)');
    expect(formSource.indexOf('allFiles.filter(isSupportedImageFile)')).toBeLessThan(
      formSource.indexOf('checkFileSize(file, UPLOAD_MAX_MB.photo)')
    );
    expect(formSource.indexOf('checkFileSize(file, UPLOAD_MAX_MB.photo)')).toBeLessThan(
      formSource.indexOf('toAdd.push(file)')
    );
    expect(formSource).toContain('Promise.allSettled(toAdd.map(resizePhoto))');
    expect(photoSource).toContain('disabled={readOnly}');
    expect(photoSource).toContain('if (readOnly) return;');
    expect(photoSource).toContain("event.target.value = '';");
  });
});
