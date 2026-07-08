import { SAMPLE_RECORD_TYPES, sampleIngredientGroupName, sampleNamesText } from '@/lib/sample';
import { LEGACY_SAMPLE_RECORD_TYPES } from '@/lib/sample/constants';

export const NOTE_RECORD_KIND = Object.freeze({
  NOTE: 'note',
  SAMPLE: 'sample',
});

export const NOTE_UNIFIED_TYPE_ALL = 'all';
export const NOTE_MENU_DEVELOPMENT_TYPE = '메뉴개발';
export const NOTE_MENU_IMPROVEMENT_TYPE = '메뉴개선';
export const NOTE_UNIFIED_TYPES = Object.freeze([
  NOTE_MENU_DEVELOPMENT_TYPE,
  NOTE_MENU_IMPROVEMENT_TYPE,
  SAMPLE_RECORD_TYPES.SAMPLE_TEST,
  SAMPLE_RECORD_TYPES.ISSUE,
]);

const SAMPLE_ID_PREFIX = 'sample:';

function cleanText(value) {
  return value == null ? '' : String(value).trim();
}

function textList(values = []) {
  return values.map(cleanText).filter(Boolean).join('\n');
}

export function sampleUnifiedId(id) {
  return `${SAMPLE_ID_PREFIX}${id}`;
}

export function isUnifiedSampleId(id) {
  return typeof id === 'string' && id.startsWith(SAMPLE_ID_PREFIX);
}

export function unifiedSampleSourceId(recordOrId) {
  const raw =
    recordOrId && typeof recordOrId === 'object'
      ? (recordOrId._sourceId ?? recordOrId.id)
      : recordOrId;
  const source = isUnifiedSampleId(raw) ? raw.slice(SAMPLE_ID_PREFIX.length) : raw;
  const numberId = Number(source);
  return Number.isSafeInteger(numberId) && numberId > 0 ? numberId : source;
}

export function isUnifiedSampleRecord(record) {
  if (isUnifiedSampleId(record)) return true;
  return record?._recordKind === NOTE_RECORD_KIND.SAMPLE || isUnifiedSampleId(record?.id);
}

export function normalizeUnifiedSampleType(value) {
  return value === SAMPLE_RECORD_TYPES.ISSUE || value === LEGACY_SAMPLE_RECORD_TYPES.ISSUE
    ? SAMPLE_RECORD_TYPES.ISSUE
    : SAMPLE_RECORD_TYPES.SAMPLE_TEST;
}

export function normalizeUnifiedNoteType(value) {
  const text = cleanText(value);
  if (NOTE_UNIFIED_TYPES.includes(text)) return text;
  return NOTE_MENU_DEVELOPMENT_TYPE;
}

export function normalizeUnifiedTypeFilter(value) {
  const text = cleanText(value);
  if (!text || text === NOTE_UNIFIED_TYPE_ALL) return NOTE_UNIFIED_TYPE_ALL;
  return NOTE_UNIFIED_TYPES.includes(text) ? text : NOTE_UNIFIED_TYPE_ALL;
}

export function noteTypeFilterHref(type) {
  const safeType = normalizeUnifiedTypeFilter(type);
  return safeType === NOTE_UNIFIED_TYPE_ALL
    ? '/note'
    : `/note?type=${encodeURIComponent(safeType)}`;
}

export function noteToUnifiedRecord(note = {}) {
  return {
    ...note,
    _recordKind: NOTE_RECORD_KIND.NOTE,
    _sourceId: note.id,
    noteType: normalizeUnifiedNoteType(note.noteType),
  };
}

export function sampleToUnifiedRecord(sample = {}) {
  const recordType = normalizeUnifiedSampleType(sample.recordType);
  const groupName = sampleIngredientGroupName(sample);
  const sampleNames = sampleNamesText(sample);
  const title = cleanText(sample.title) || sampleNames || groupName || '샘플 기록';
  const description = cleanText(sample.description);
  const result = cleanText(sample.result);
  const sourceId = sample.id;

  return {
    ...sample,
    id: sampleUnifiedId(sourceId),
    _recordKind: NOTE_RECORD_KIND.SAMPLE,
    _sourceId: sourceId,
    _sourceRecord: sample,
    brand: cleanText(sample.brand) || 'main',
    title,
    menuName: title,
    menuCode: cleanText(sample.ingredientGroupCode),
    category: cleanText(sample.category) || groupName || '미분류',
    noteType: recordType,
    recordType,
    status: recordType === SAMPLE_RECORD_TYPES.ISSUE ? '보류' : '테스트',
    testContent: description,
    tasteEval: result,
    managerEval: '',
    materials: sampleNames || groupName,
    issues: recordType === SAMPLE_RECORD_TYPES.ISSUE ? textList([description, result]) : '',
    improvements: cleanText(sample.improvements),
    nextAction: cleanText(sample.nextAction),
    costNote: cleanText(sample.price),
    parentId: sample.parentId ? sampleUnifiedId(sample.parentId) : null,
    linkedSampleId: sourceId,
  };
}

export function buildUnifiedNoteRecords(notes = [], samples = []) {
  const noteRecords = Array.isArray(notes) ? notes.map(noteToUnifiedRecord) : [];
  const sampleRecords = Array.isArray(samples) ? samples.map(sampleToUnifiedRecord) : [];
  return [...noteRecords, ...sampleRecords];
}
