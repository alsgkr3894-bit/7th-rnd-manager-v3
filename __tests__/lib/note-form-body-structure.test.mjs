import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/note/_NoteFormBody.jsx'), 'utf8');
const writePageSource = readFileSync(resolve('app/note/write/page.jsx'), 'utf8');
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
    expect(formSource).toContain('getAllNotesCached');
    expect(formSource).not.toContain('getAllNotes }');
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

  test('note photo upload keeps unsupported files out before resize', () => {
    expect(photoSource).toContain('import { isSupportedImageFile, resizePhoto }');
    expect(photoSource).toContain('accept="image/*"');
    expect(photoSource).toContain('allFiles.filter(isSupportedImageFile)');
    expect(photoSource).toContain("showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn')");
    expect(photoSource).toContain('Promise.allSettled(targets.map(file => resizePhoto(file)))');
    expect(photoSource).toContain("event.target.value = '';");
  });

  test('note write draft state is not consumed or cleared for viewer', () => {
    expect(writePageSource).toContain('if (!roleReady) return;');
    expect(writePageSource).toContain('if (!canEdit) return;');
    expect(writePageSource).toContain('}, [canEdit, roleReady]);');
    expect(writePageSource).toContain('if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);');
    expect(writePageSource).toContain('{canEdit && showDraftBanner && !fromTitle && (');
  });
});
