import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  findRelatedSamplesForNote,
  hasStoredNoteDraft,
  isNoteFormChanged,
  mergeDraftWithCurrentPhotos,
  normalizeNoteRouteId,
} from '../../app/note/[id]/detail/noteDetailUtils.js';

const pageSource = readFileSync(resolve('app/note/[id]/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/note/[id]/detail/NoteDetailActions.jsx'), 'utf8');
const draftBannerSource = readFileSync(resolve('app/note/[id]/detail/NoteDraftBanner.jsx'), 'utf8');
const timelineSource = readFileSync(resolve('app/note/[id]/detail/ChainTimeline.jsx'), 'utf8');
const relatedSource = readFileSync(resolve('app/note/[id]/detail/RelatedSamplesPanel.jsx'), 'utf8');
const utilsSource = readFileSync(resolve('app/note/[id]/detail/noteDetailUtils.js'), 'utf8');

describe('note detail page helpers', () => {
  test('route id and draft helpers preserve edit-page safety checks', () => {
    expect(normalizeNoteRouteId('12')).toBe(12);
    expect(normalizeNoteRouteId('0')).toBeNull();
    expect(normalizeNoteRouteId('bad')).toBeNull();

    expect(hasStoredNoteDraft({ title: '새 제목' }, { title: '기존 제목' })).toBe(true);
    expect(
      hasStoredNoteDraft(
        { title: '제목', testContent: '내용', managerEval: '평가' },
        { title: '제목', testContent: '내용', managerEval: '평가' }
      )
    ).toBe(false);
  });

  test('form comparison ignores photos and draft restore keeps current photos when draft has none', () => {
    expect(
      isNoteFormChanged(
        { title: 'A', photos: [{ data: 'new' }] },
        { title: 'A', photos: [{ data: 'old' }] }
      )
    ).toBe(false);
    expect(isNoteFormChanged({ title: 'B', photos: [] }, { title: 'A', photos: [] })).toBe(true);
    expect(
      mergeDraftWithCurrentPhotos({ title: 'Draft', photos: [] }, { photos: ['current'] })
    ).toEqual({
      title: 'Draft',
      photos: ['current'],
    });
  });

  test('related sample matching uses normalized sampleNames instead of joined menuName only', () => {
    const samples = [
      { id: 1, sampleNames: ['콤비네이션 피자', '포테이토 피자'] },
      { id: 2, sampleNames: ['페퍼로니 피자'] },
      { id: 3, menuName: '콤비네이션 피자' },
    ];

    expect(
      findRelatedSamplesForNote({ menuName: ' 콤비네이션 피자 ' }, samples).map(s => s.id)
    ).toEqual([1, 3]);
    expect(findRelatedSamplesForNote({}, samples)).toEqual([]);
  });
});

describe('note detail page structure', () => {
  test('route page keeps load/save orchestration and delegates large detail sections', () => {
    expect(pageSource).toContain('export default function Page');
    expect(pageSource).toContain('normalizeNoteRouteId(id)');
    expect(pageSource).toContain('findRelatedSamplesForNote(note, allSamples)');
    expect(pageSource).toContain('hasStoredNoteDraft(draft, note)');
    expect(pageSource).toContain('isNoteFormChanged(form, originalRef.current)');
    expect(pageSource).toContain('mergeDraftWithCurrentPhotos(draft, prev)');
    expect(pageSource).toContain('<NoteDetailActions');
    expect(pageSource).toContain('<NoteDraftBanner');
    expect(pageSource).toContain('if (canEdit) clearDraft(KEYS.NOTE_DRAFT(noteId));');
    expect(pageSource).toContain('{canEdit && showDraftBanner && (');
    expect(pageSource).toContain('<NoteFormBody');
    expect(pageSource).toContain('<ChainTimeline');
    expect(pageSource).toContain('<RelatedSamplesPanel');
    expect(pageSource).not.toContain('COST_LINKS');
    expect(pageSource).not.toContain('STATUS_COLORS');
    expect(pageSource).not.toContain('sampleNamesOf');
    expect(pageSource).not.toContain('버전 체인');
    expect(pageSource).not.toContain('관련 샘플기록');
    expect(pageSource).not.toContain('<img');
  });

  test('split note detail files own actions, draft banner, timeline, samples, and helpers', () => {
    expect(actionsSource).toContain('export function NoteDetailActions');
    expect(actionsSource).toContain('const COST_LINKS');
    expect(actionsSource).toContain('function NoteCostMenu');
    expect(actionsSource).toContain('MENU_MASTER_ROUTE');
    expect(actionsSource).toContain('복사 중…');
    expect(actionsSource).toContain('↗ 원가');
    expect(actionsSource).toContain('📷 샘플 작성');

    expect(draftBannerSource).toContain('export function NoteDraftBanner');
    expect(draftBannerSource).toContain('저장되지 않은 임시저장이 있어요.');
    expect(timelineSource).toContain('export function ChainTimeline');
    expect(timelineSource).toContain('STATUS_COLORS');
    expect(timelineSource).toContain('function TimelineItem');
    expect(timelineSource).toContain('버전 체인');
    expect(timelineSource).toContain('현재');

    expect(relatedSource).toContain('export function RelatedSamplesPanel');
    expect(relatedSource).toContain('function RelatedSampleButton');
    expect(relatedSource).toContain('function RelatedSampleThumbnail');
    expect(relatedSource).toContain('<img');
    expect(relatedSource).toContain("'★'.repeat(sample.rating)");
    expect(utilsSource).toContain('export function findRelatedSamplesForNote');
    expect(utilsSource).toContain('sampleNamesOf(sample)');
  });
});
