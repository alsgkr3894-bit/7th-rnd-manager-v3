import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const journalPageSource = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');

describe('note journal page linkage', () => {
  test('연구일지는 노트목록의 샘플/이슈 통합 기록도 같은 날짜 기록으로 읽는다', () => {
    expect(journalPageSource).toContain("import { getAllSamples } from '@/lib/sample'");
    expect(journalPageSource).toContain('sampleToUnifiedRecord');
    expect(journalPageSource).toContain('const sampleRecords = useMemo(');
    expect(journalPageSource).toContain('samples.map(sampleToUnifiedRecord)');
    expect(journalPageSource).toContain('const journalRecords = useMemo(() => [...notes, ...sampleRecords]');
    expect(journalPageSource).toContain('journalRecords');
    expect(journalPageSource).toContain('journalRecords.forEach(note =>');
    expect(journalPageSource).toContain('journalRecords.forEach(n =>');
    expect(journalPageSource).toContain('journalRecords');
    expect(journalPageSource).toContain('withRelatedJournalPhotos(rawDayNotes, notes)');
  });

  test('통합 샘플 기록의 수정 버튼은 원본 샘플 상세로 이동한다', () => {
    expect(journalPageSource).toContain('isUnifiedSampleRecord(note)');
    expect(journalPageSource).toContain('router.push(`/note/sample/${unifiedSampleSourceId(note)}`)');
    expect(journalPageSource).toContain(': router.push(`/note/${note.id}`)');
  });

  test('연구일지 사진은 원본 샘플/노트 사진을 자동 병합하지 않는다', () => {
    expect(journalPageSource).toContain('withoutJournalSourceDuplicatePhotos');
    expect(journalPageSource).toContain('filterJournalPhotosAgainstSources');
    expect(journalPageSource).toContain('setJournalForm(journalFormFromEntry(journalEntry))');
    expect(journalPageSource).toContain(
      'photos: Array.isArray(journalForm.photos) ? journalForm.photos : []'
    );
    expect(journalPageSource).not.toContain('mergeJournalPhotos(journalForm.photos, sourcePhotos)');
    expect(journalPageSource).not.toContain('journalFormFromEntry(journalEntry, sourcePhotos)');
  });
});
