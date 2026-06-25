import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/note/_NoteFormBody.jsx'), 'utf8');
const writePageSource = readFileSync(resolve('app/note/write/page.jsx'), 'utf8');
const requiredSource = readFileSync(resolve('app/note/_NoteRequiredFields.jsx'), 'utf8');
const detailSource = readFileSync(resolve('app/note/_NoteDetailFields.jsx'), 'utf8');
const evaluationSource = readFileSync(resolve('app/note/_NoteEvaluationFields.jsx'), 'utf8');
const cloneSource = readFileSync(resolve('app/note/_NoteClonePreviousCard.jsx'), 'utf8');
const photoSource = readFileSync(resolve('app/note/_NotePhotoSection.jsx'), 'utf8');
const reportSource = readFileSync(resolve('app/note/_NoteReportSummaryCard.jsx'), 'utf8');
const reportTextSource = readFileSync(resolve('lib/note/report.js'), 'utf8');
const collapsibleSource = readFileSync(resolve('app/note/_CollapsibleCard.jsx'), 'utf8');
const tempCostSource = readFileSync(resolve('components/note/TempCostCalculator.jsx'), 'utf8');

describe('note form body structure', () => {
  test('NoteFormBody keeps form state orchestration and delegates sections', () => {
    expect(formSource).toContain('<NoteRequiredFields');
    expect(formSource).toContain('<NoteClonePreviousCard');
    expect(formSource).toContain('<NoteEvaluationFields');
    expect(formSource).toContain('<NoteDetailFields');
    expect(formSource).toContain('<NotePhotoSection');
    expect(formSource).toContain('<NoteReportSummaryCard');
    expect(formSource).toContain('makeFieldUpdater(setForm)');
    expect(formSource).toContain('normalizeNoteFormForSave');
    expect(formSource).toContain('menuName: title');
    expect(formSource).toContain('function updateTitle(value)');
    expect(formSource).toContain('generateNoteReportText(form)');
    expect(reportTextSource).toContain("import { noteDisplayTitle } from './display'");
    expect(reportTextSource).toContain("const title = noteDisplayTitle(form, '—')");
    expect(reportTextSource).not.toContain("form.title || form.menuName || '—'");
    expect(formSource).toContain('getAllNotesCached');
    expect(formSource).toContain('setSourceNotes(notes)');
    expect(formSource).toContain('let alive = true;');
    expect(formSource).toContain('if (!alive) return;');
    expect(formSource).toContain('alive = false;');
    expect(formSource).not.toContain('getAllNotes }');
    expect(formSource).not.toContain('사진 첨부');
    expect(formSource).not.toContain('보고용 복사');
    expect(formSource).not.toContain('<TagInput');
  });

  test('note form section components own their presentation details', () => {
    expect(requiredSource).toContain('export function NoteRequiredFields');
    expect(requiredSource).toContain('const titleValue = form.title || form.menuName ||');
    expect(requiredSource).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(requiredSource).toContain('testRound');
    expect(requiredSource).toContain('핵심 테스트 내용');
    expect(requiredSource).not.toContain('<ComboBox');
    expect(requiredSource).not.toContain('menuNames');
    expect(requiredSource).toContain('onChange={event => updateTitle(event.target.value)}');
    expect(detailSource).toContain('export function NoteDetailFields');
    expect(detailSource).toContain('<CollapsibleCard');
    expect(detailSource).toContain('defaultOpen={false}');
    expect(detailSource).toContain('상세 기록');
    expect(detailSource).not.toContain('<TagInput');
    expect(evaluationSource).toContain('export function NoteEvaluationFields');
    expect(evaluationSource).toContain('NOTE_EVALUATION_FIELDS.map');
    expect(evaluationSource).toContain('<NoteRatingPicker');
    expect(evaluationSource).toContain('<TagInput');
    expect(cloneSource).toContain('export function NoteClonePreviousCard');
    expect(cloneSource).toContain('buildPreviousRoundDraft(selected, current)');
    expect(cloneSource).toContain('복제 적용');
    expect(photoSource).toContain('export function NotePhotoSection');
    expect(photoSource).toContain('MAX_NOTE_PHOTOS');
    expect(photoSource).toContain('resizePhoto');
    expect(reportSource).toContain('export function NoteReportSummaryCard');
    expect(reportSource).toContain('<CollapsibleCard');
    expect(reportSource).toContain('defaultOpen={false}');
    expect(reportSource).toContain('copyText(reportText)');
    expect(reportSource).toContain('보고용 복사');
    expect(tempCostSource).toContain('<CollapsibleCard');
    expect(tempCostSource).toContain('defaultOpen={false}');
  });

  test('optional note sections use closed collapsible cards by default', () => {
    expect(collapsibleSource).toContain('defaultOpen = false');
    expect(collapsibleSource).toContain('aria-expanded={open}');
    expect(collapsibleSource).toContain('{open &&');
    expect(collapsibleSource).toContain('setOpen(value => !value)');
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
    expect(writePageSource).toContain('normalizeNoteFormForSave(form)');
    expect(writePageSource).toContain('if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);');
    expect(writePageSource).toContain('{canEdit && showDraftBanner && !fromTitle && (');
  });
});
