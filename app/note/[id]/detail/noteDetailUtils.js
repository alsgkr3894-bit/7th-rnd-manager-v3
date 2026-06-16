import { sampleNamesOf } from '@/lib/sample';

export function normalizeNoteRouteId(id) {
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function hasStoredNoteDraft(draft, note) {
  return (
    draft &&
    (draft.title !== note.title ||
      draft.testContent !== note.testContent ||
      draft.managerEval !== note.managerEval)
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
