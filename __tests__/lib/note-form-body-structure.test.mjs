import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/note/_NoteFormBody.jsx'), 'utf8');
const requiredSource = readFileSync(resolve('app/note/_NoteRequiredFields.jsx'), 'utf8');
const detailSource = readFileSync(resolve('app/note/_NoteDetailFields.jsx'), 'utf8');
const photoSource = readFileSync(resolve('app/note/_NotePhotoSection.jsx'), 'utf8');
const reportSource = readFileSync(resolve('app/note/_NoteReportSummaryCard.jsx'), 'utf8');

describe('note form body structure', () => {
  test('NoteFormBody keeps form state orchestration and delegates sections', () => {
    expect(formSource).toContain('<NoteRequiredFields');
    expect(formSource).toContain('<NoteDetailFields');
    expect(formSource).toContain('<NotePhotoSection');
    expect(formSource).toContain('<NoteReportSummaryCard');
    expect(formSource).toContain('makeFieldUpdater(setForm)');
    expect(formSource).toContain('generateNoteReportText(form)');
    expect(formSource).not.toContain('사진 첨부');
    expect(formSource).not.toContain('보고용 복사');
    expect(formSource).not.toContain('<TagInput');
  });

  test('note form section components own their presentation details', () => {
    expect(requiredSource).toContain('export function NoteRequiredFields');
    expect(requiredSource).toContain('핵심 테스트 내용');
    expect(requiredSource).toContain('<ComboBox');
    expect(detailSource).toContain('export function NoteDetailFields');
    expect(detailSource).toContain('상세 기록');
    expect(detailSource).toContain('<TagInput');
    expect(photoSource).toContain('export function NotePhotoSection');
    expect(photoSource).toContain('MAX_NOTE_PHOTOS');
    expect(photoSource).toContain('resizePhoto');
    expect(reportSource).toContain('export function NoteReportSummaryCard');
    expect(reportSource).toContain('copyText(reportText)');
    expect(reportSource).toContain('보고용 복사');
  });
});
