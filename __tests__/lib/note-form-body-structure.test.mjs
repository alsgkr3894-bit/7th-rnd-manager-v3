import { readFileSync } from 'fs';
import { resolve } from 'path';

const formSource = readFileSync(resolve('app/note/_NoteFormBody.jsx'), 'utf8');
const writePageSource = readFileSync(resolve('app/note/write/page.jsx'), 'utf8');
const requiredSource = readFileSync(resolve('app/note/_NoteRequiredFields.jsx'), 'utf8');
const detailSource = readFileSync(resolve('app/note/_NoteDetailFields.jsx'), 'utf8');
const evaluationSource = readFileSync(resolve('app/note/_NoteEvaluationFields.jsx'), 'utf8');
const cloneSource = readFileSync(resolve('app/note/_NoteClonePreviousCard.jsx'), 'utf8');
const photoSource = readFileSync(resolve('app/note/_NotePhotoSection.jsx'), 'utf8');
const clipboardSource = readFileSync(resolve('lib/image/clipboard.js'), 'utf8');
const collapsibleSource = readFileSync(resolve('app/note/_CollapsibleCard.jsx'), 'utf8');
const tempCostSource = readFileSync(resolve('components/note/TempCostCalculator.jsx'), 'utf8');
const fieldSource = readFileSync(resolve('components/note/FormFields.jsx'), 'utf8');

describe('note form body structure', () => {
  test('NoteFormBody keeps form state orchestration and delegates sections', () => {
    expect(formSource).toContain('<NoteRequiredFields');
    expect(formSource).toContain('<NoteClonePreviousCard');
    expect(formSource).toContain('<NoteEvaluationFields');
    expect(formSource).toContain('<NoteDetailFields');
    expect(formSource).toContain('<NotePhotoSection');
    expect(formSource).toContain('function NoteWriteProgressCard');
    expect(formSource).toContain(
      "const [openRightPanel, setOpenRightPanel] = useState('progress')"
    );
    expect(formSource).toContain("open={openRightPanel === 'progress'}");
    expect(formSource).toContain("setOpenRightPanel(next ? 'progress' : '')");
    expect(formSource).toContain("gridTemplateColumns: 'minmax(0, 1fr) clamp(320px, 27vw, 390px)'");
    expect(formSource).toContain('makeFieldUpdater(setForm)');
    expect(formSource).toContain('normalizeNoteFormForSave');
    expect(formSource).toContain('menuName: title');
    expect(formSource).toContain(
      'category: normalizeNoteCategoryForBrand(form?.category, form?.brand)'
    );
    expect(formSource).toContain('MENU_DEVELOPMENT_NOTE_TYPES.includes(noteType)');
    expect(formSource).toContain(
      'const existingNotes = Array.isArray(options.existingNotes) ? options.existingNotes : []'
    );
    expect(formSource).toContain('generateNextNoteMenuCode(existingNotes');
    expect(formSource).toContain('function updateTitle(value)');
    expect(formSource).not.toContain('generateNoteReportText(form)');
    expect(formSource).not.toContain("from '@/lib/note/report'");
    expect(formSource).not.toContain("from '@/app/note/_NoteReportSummaryCard'");
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
    expect(requiredSource).toContain('function NoteFormSection');
    expect(requiredSource).toContain('노트 작성');
    expect(requiredSource).not.toContain('필수 항목');
    expect(requiredSource).toContain('title="메뉴 정보"');
    expect(requiredSource).toContain('title="테스트 기본값"');
    expect(requiredSource).toContain('title="분류와 상태"');
    expect(requiredSource).toContain('title="테스트 내용"');
    expect(requiredSource).toContain('const titleValue = form.title || form.menuName ||');
    expect(requiredSource).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(requiredSource).toContain('minHeight: 180');
    expect(requiredSource).toContain('testRound');
    expect(requiredSource).toContain('시식 테스트 내용');
    expect(requiredSource).not.toContain('<ComboBox');
    expect(requiredSource).not.toContain('menuNames');
    expect(requiredSource).toContain('const [titleDraft, setTitleDraft] = useState(titleValue)');
    expect(requiredSource).toContain('titleComposingRef.current');
    expect(requiredSource).toContain('onCompositionStart');
    expect(requiredSource).toContain('onCompositionEnd');
    expect(requiredSource).toContain('onChange={handleTitleChange}');
    expect(requiredSource).toContain('commitTitle(titleDraft)');
    expect(requiredSource).toContain('placeholder="메뉴명 또는 테스트 제목"');
    expect(requiredSource).toContain('placeholder="차수"');
    expect(requiredSource).not.toContain('placeholder="예: 완성새우 떡라비마요 조합 테스트"');
    expect(requiredSource).not.toContain('placeholder="예: 1, 2차"');
    expect(requiredSource).toContain('activeBrand.name');
    expect(requiredSource).toContain('getNoteCategoryOptionsForBrand(form.brand)');
    expect(writePageSource).toContain('function WriteTypeStep');
    expect(writePageSource).toContain('WRITE_TYPE_OPTIONS');
    expect(writePageSource).toContain('메뉴개발');
    expect(writePageSource).toContain('메뉴개선');
    expect(writePageSource).toContain('샘플테스트');
    expect(writePageSource).toContain('제품이슈');
    expect(writePageSource).toContain('SAMPLE_RECORD_TYPE_BY_WRITE_TYPE');
    expect(requiredSource).not.toContain('<Field label="유형">');
    expect(requiredSource).toContain('function handleCategoryChange');
    expect(requiredSource).not.toContain('function handleNoteTypeChange');
    expect(requiredSource).not.toContain('function handleBrandChange');
    expect(requiredSource).not.toContain("updateField('brand', found ? found.id : 'main')");
    expect(requiredSource).toContain('<details');
    expect(requiredSource).toContain('메뉴코드 설정');
    expect(requiredSource).toContain("caption={menuCodeValue || '저장 시 자동 코드'}");
    expect(requiredSource).not.toContain("caption={menuCodeValue || '코드 미입력'}");
    expect(requiredSource).not.toContain('placeholder="예: RND-260702-1"');
    expect(requiredSource).toContain('placeholder="자동 생성"');
    expect(requiredSource).toContain('const [dateDraft, setDateDraft]');
    expect(requiredSource).toContain('value={dateDraft}');
    expect(requiredSource).not.toContain('quickDateDraft');
    expect(requiredSource).not.toContain('type="date"');
    expect(requiredSource).not.toContain('placeholder="240821"');
    expect(requiredSource).not.toContain('hint="YYMMDD · YYYYMMDD"');
    expect(requiredSource).not.toContain('STATUS_COLORS');
    expect(requiredSource).toContain('options={STATUSES}');
    expect(requiredSource).not.toContain(
      "caption={form.testContent ? `${form.testContent.length}자` : '필수'}"
    );
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
    expect(cloneSource).toContain('제목과 차수만');
    expect(photoSource).toContain('export function NotePhotoSection');
    expect(photoSource).toContain('MAX_NOTE_PHOTOS');
    expect(photoSource).toContain('resizePhoto');
    expect(photoSource).toContain('clipboardImageFiles');
    expect(photoSource).toContain('UPLOAD_MAX_MB.photo');
    expect(photoSource).toContain('checkFileSize(file, UPLOAD_MAX_MB.photo)');
    expect(photoSource).toContain('event.clipboardData');
    expect(photoSource).toContain("document.addEventListener('paste'");
    expect(photoSource).toContain('Ctrl+V 붙여넣기');
    expect(photoSource).toContain('function makePrimary(idx)');
    expect(photoSource).toContain('대표로');
    expect(tempCostSource).toContain('<CollapsibleCard');
    expect(tempCostSource).toContain('defaultOpen={false}');
  });

  test('note field wrapper does not turn segment whitespace clicks into first option clicks', () => {
    expect(fieldSource).toContain('export function Field');
    expect(fieldSource).toContain('<div style={{ display:');
    expect(fieldSource).not.toContain('<label style={{ display:');
    expect(fieldSource).toContain('type="button"');
    expect(fieldSource).toContain('aria-pressed={value === o}');
    expect(fieldSource).toContain('event.stopPropagation()');
    expect(fieldSource).toContain('!disabled && value !== o');
  });

  test('note write page defaults a fresh note to first test round', () => {
    expect(writePageSource).toContain("const DEFAULT_FIRST_TEST_ROUND = '1';");
    expect(writePageSource).toContain('function withDefaultFirstTestRound');
    expect(writePageSource).toContain(
      "String(value.testRound || '').trim() || DEFAULT_FIRST_TEST_ROUND"
    );
    expect(writePageSource).toContain('withDefaultFirstTestRound({');
  });

  test('optional note sections use closed collapsible cards by default', () => {
    expect(collapsibleSource).toContain('defaultOpen = false');
    expect(collapsibleSource).toContain('open: controlledOpen');
    expect(collapsibleSource).toContain('const controlled = typeof controlledOpen ===');
    expect(collapsibleSource).toContain('aria-expanded={open}');
    expect(collapsibleSource).toContain('gridTemplateRows: open ?');
    expect(collapsibleSource).toContain('color: open ?');
    expect(collapsibleSource).toContain('setOpen(!open)');
  });

  test('note photo upload keeps unsupported files out before resize', () => {
    expect(photoSource).toContain('import { isSupportedImageFile, resizePhoto }');
    expect(photoSource).toContain('accept="image/*"');
    expect(photoSource).toContain('allFiles.filter(isSupportedImageFile)');
    expect(photoSource).toContain("showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn')");
    expect(photoSource).toContain('Promise.allSettled(targets.map(file => resizePhoto(file)))');
    expect(photoSource).toContain("event.target.value = '';");
    expect(clipboardSource).toContain('item.getAsFile()');
    expect(clipboardSource).toContain('new File([file]');
  });

  test('note write draft state is not consumed or cleared for viewer', () => {
    expect(writePageSource).toContain('if (!roleReady) return;');
    expect(writePageSource).toContain('if (!canEdit) return;');
    expect(writePageSource).toContain('}, [canEdit, roleReady]);');
    expect(writePageSource).toContain('getAllNotesCached');
    expect(writePageSource).toContain('normalizeNoteFormForSave(form, { existingNotes })');
    expect(writePageSource).toContain('if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);');
    expect(writePageSource).toContain('isDirtyRef.current = false;');
    expect(writePageSource).toContain("router.replace('/note')");
    expect(writePageSource).toContain('{canEdit && showDraftBanner && !fromTitle && (');
  });
});
