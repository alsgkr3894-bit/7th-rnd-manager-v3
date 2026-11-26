import { sampleNamesOf } from '@/lib/sample';

export function normalizeNoteRouteId(id) {
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// 사진은 임시저장에 넣지 않고, id·시각은 사용자가 고치는 값이 아니다
const DRAFT_IGNORED_KEYS = new Set(['photos', 'id', 'createdAt', 'updatedAt']);

/** 임시저장(폼 전체, 사진 제외)과 같은 범위로 비교한다 — 상태만 바꾼 초안도 복구 안내가 떠야 한다 */
export function hasStoredNoteDraft(draft, note) {
  if (!draft || !note) return false;
  return Object.keys(draft).some(
    key => !DRAFT_IGNORED_KEYS.has(key) && JSON.stringify(draft[key]) !== JSON.stringify(note[key])
  );
}

export function stripNotePhotos(record) {
  return { ...record, photos: undefined };
}

export function isNoteFormChanged(form, original) {
  return JSON.stringify(stripNotePhotos(form)) !== JSON.stringify(stripNotePhotos(original));
}

export function mergeDraftWithCurrentPhotos(draft, currentForm) {
  return { ...draft, photos: draft.photos?.length ? draft.photos : currentForm.photos };
}

export function findRelatedSamplesForNote(note, allSamples = []) {
  if (!note?.menuName) return [];
  const menuName = note.menuName.trim().toLowerCase();
  return allSamples.filter(sample =>
    sampleNamesOf(sample).some(name => name.trim().toLowerCase() === menuName)
  );
}
