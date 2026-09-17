import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const journalPageSource = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');
const journalDataSource = readFileSync(resolve('app/note/journal/useJournalData.js'), 'utf8');
const journalFormHookSource = readFileSync(resolve('app/note/journal/useJournalForm.js'), 'utf8');
const journalNavSource = readFileSync(resolve('app/note/journal/useJournalNavigation.js'), 'utf8');
const journalHeaderActionsSource = readFileSync(
  resolve('app/note/journal/_JournalHeaderActions.jsx'),
  'utf8'
);
const journalDayRecordsSource = readFileSync(
  resolve('app/note/journal/_JournalDayRecords.jsx'),
  'utf8'
);

describe('note journal page linkage', () => {
  test('연구일지는 노트목록의 샘플/이슈 통합 기록도 같은 날짜 기록으로 읽는다', () => {
    // 데이터 로드·병합은 useJournalData.js로 분리됐다.
    expect(journalDataSource).toContain("import { getAllSamples } from '@/lib/sample'");
    expect(journalDataSource).toContain('sampleToUnifiedRecord');
    expect(journalDataSource).toContain('const sampleRecords = useMemo(');
    expect(journalDataSource).toContain('samples.map(sampleToUnifiedRecord)');
    expect(journalDataSource).toContain('[...notes, ...sampleRecords, ...marketResearchRecords]');
    expect(journalDataSource).toContain('journalRecords');
    expect(journalDataSource).toContain('journalRecords.forEach(note =>');
    expect(journalDataSource).toContain('journalRecords.forEach(n =>');
    expect(journalDataSource).toContain('withRelatedJournalPhotos(rawDayNotes, notes)');
  });

  test('연구일지는 시장조사 기록도 같은 날짜 기록으로 읽는다', () => {
    expect(journalDataSource).toContain(
      "import { getAllMarketResearch } from '@/lib/note/market-research'"
    );
    expect(journalDataSource).toContain('marketResearchToUnifiedRecord');
    expect(journalDataSource).toContain('const marketResearchRecords = useMemo(');
    expect(journalDataSource).toContain('marketResearchRows.map(marketResearchToUnifiedRecord)');
  });

  test('통합 샘플/시장조사 기록의 수정 버튼은 각각의 원본 화면으로 이동한다', () => {
    // 기록 카드 목록·수정 라우팅은 _JournalDayRecords.jsx로 분리됐다.
    expect(journalDayRecordsSource).toContain('isUnifiedSampleRecord(note)');
    expect(journalDayRecordsSource).toContain(
      'router.push(`/note/sample/${unifiedSampleSourceId(note)}`)'
    );
    expect(journalDayRecordsSource).toContain('isUnifiedMarketResearchRecord(note)');
    expect(journalDayRecordsSource).toContain(
      'router.push(`/note/market?edit=${unifiedMarketResearchSourceId(note)}`)'
    );
    expect(journalDayRecordsSource).toContain('router.push(`/note/${note.id}`)');
  });

  test('연구일지 사진은 원본 샘플/노트 사진을 자동 병합하지 않는다', () => {
    expect(journalDataSource).toContain('withoutJournalSourceDuplicatePhotos');
    // 사진 중복 필터 구현은 journalPhotos.js로 분리됐다.
    expect(readFileSync(resolve('app/note/journal/journalPhotos.js'), 'utf8')).toContain(
      'filterJournalPhotosAgainstSources'
    );
    expect(journalFormHookSource).toContain('setJournalForm(journalFormFromEntry(journalEntry))');
    expect(journalFormHookSource).toContain(
      'photos: Array.isArray(journalForm.photos) ? journalForm.photos : []'
    );
    expect(journalFormHookSource).not.toContain(
      'mergeJournalPhotos(journalForm.photos, sourcePhotos)'
    );
    expect(journalFormHookSource).not.toContain('journalFormFromEntry(journalEntry, sourcePhotos)');
  });
});

describe('연구일지 날짜 선택에 조회 버튼이 있다', () => {
  test('날짜 입력은 즉시 조회하지 않고 초안(dateDraft)에만 반영된다', () => {
    // 날짜 상태·조회 로직은 useJournalNavigation.js로, 입력 UI는
    // _JournalHeaderActions.jsx로 분리됐다.
    expect(journalNavSource).toContain(
      'const [dateDraft, setDateDraft] = useState(() => todayLocalDate());'
    );
    expect(journalHeaderActionsSource).toContain('value={dateDraft}');
    expect(journalHeaderActionsSource).toContain(
      'if (e.target.value) setDateDraft(e.target.value);'
    );
    // date가 바뀌면(빠른 날짜 입력·이전/다음 화살표 포함) dateDraft도 함께 동기화돼야
    // 조회 버튼이 "아직 조회 안 됨" 상태로 잘못 남지 않는다.
    expect(journalNavSource).toMatch(
      /useEffect\(\(\) => \{\s*setMonth\(date\.slice\(0, 7\)\);\s*setDateDraft\(date\);\s*\}, \[date\]\);/
    );
  });

  test('조회 버튼은 Enter 또는 클릭으로 dateDraft를 date에 반영한다', () => {
    expect(journalNavSource).toContain('function applyDate(value = dateDraft) {');
    expect(journalHeaderActionsSource).toContain("if (e.key === 'Enter') {");
    expect(journalHeaderActionsSource).toContain('onClick={() => applyDate()}');
    expect(journalHeaderActionsSource).toContain('disabled={!dateDraft || dateDraft === date}');
  });
});
