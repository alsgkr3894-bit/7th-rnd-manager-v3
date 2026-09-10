import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const journalPageSource = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');

describe('note journal page linkage', () => {
  test('연구일지는 노트목록의 샘플/이슈 통합 기록도 같은 날짜 기록으로 읽는다', () => {
    expect(journalPageSource).toContain("import { getAllSamples } from '@/lib/sample'");
    expect(journalPageSource).toContain('sampleToUnifiedRecord');
    expect(journalPageSource).toContain('const sampleRecords = useMemo(');
    expect(journalPageSource).toContain('samples.map(sampleToUnifiedRecord)');
    expect(journalPageSource).toContain('[...notes, ...sampleRecords, ...marketResearchRecords]');
    expect(journalPageSource).toContain('journalRecords');
    expect(journalPageSource).toContain('journalRecords.forEach(note =>');
    expect(journalPageSource).toContain('journalRecords.forEach(n =>');
    expect(journalPageSource).toContain('journalRecords');
    expect(journalPageSource).toContain('withRelatedJournalPhotos(rawDayNotes, notes)');
  });

  test('연구일지는 시장조사 기록도 같은 날짜 기록으로 읽는다', () => {
    expect(journalPageSource).toContain(
      "import { getAllMarketResearch } from '@/lib/note/market-research'"
    );
    expect(journalPageSource).toContain('marketResearchToUnifiedRecord');
    expect(journalPageSource).toContain('const marketResearchRecords = useMemo(');
    expect(journalPageSource).toContain('marketResearchRows.map(marketResearchToUnifiedRecord)');
  });

  test('통합 샘플/시장조사 기록의 수정 버튼은 각각의 원본 화면으로 이동한다', () => {
    expect(journalPageSource).toContain('isUnifiedSampleRecord(note)');
    expect(journalPageSource).toContain(
      'router.push(`/note/sample/${unifiedSampleSourceId(note)}`)'
    );
    expect(journalPageSource).toContain('isUnifiedMarketResearchRecord(note)');
    expect(journalPageSource).toContain(
      'router.push(`/note/market?edit=${unifiedMarketResearchSourceId(note)}`)'
    );
    expect(journalPageSource).toContain('router.push(`/note/${note.id}`)');
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

describe('연구일지 날짜 선택에 조회 버튼이 있다', () => {
  test('날짜 입력은 즉시 조회하지 않고 초안(dateDraft)에만 반영된다', () => {
    expect(journalPageSource).toContain(
      'const [dateDraft, setDateDraft] = useState(() => todayLocalDate());'
    );
    expect(journalPageSource).toContain('value={dateDraft}');
    expect(journalPageSource).toContain('if (e.target.value) setDateDraft(e.target.value);');
    // date가 바뀌면(빠른 날짜 입력·이전/다음 화살표 포함) dateDraft도 함께 동기화돼야
    // 조회 버튼이 "아직 조회 안 됨" 상태로 잘못 남지 않는다.
    expect(journalPageSource).toMatch(
      /useEffect\(\(\) => \{\s*setMonth\(date\.slice\(0, 7\)\);\s*setDateDraft\(date\);\s*\}, \[date\]\);/
    );
  });

  test('조회 버튼은 Enter 또는 클릭으로 dateDraft를 date에 반영한다', () => {
    expect(journalPageSource).toContain('function applyDate(value = dateDraft) {');
    expect(journalPageSource).toContain("if (e.key === 'Enter') {");
    expect(journalPageSource).toContain('onClick={() => applyDate()}');
    expect(journalPageSource).toContain('disabled={!dateDraft || dateDraft === date}');
  });
});
