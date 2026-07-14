import {
  NOTE_MENU_DEVELOPMENT_TYPE,
  NOTE_MENU_IMPROVEMENT_TYPE,
  NOTE_UNIFIED_TYPE_ALL,
  buildUnifiedNoteRecords,
  isUnifiedMarketResearchId,
  isUnifiedMarketResearchRecord,
  isUnifiedSampleId,
  marketResearchToUnifiedRecord,
  normalizeUnifiedTypeFilter,
  noteTypeFilterHref,
  sampleToUnifiedRecord,
  unifiedMarketResearchSourceId,
  unifiedSampleSourceId,
} from '../../lib/note/unified-records.js';
import { LEGACY_SAMPLE_RECORD_TYPES, SAMPLE_RECORD_TYPES } from '../../lib/sample/constants.js';

describe('note unified records', () => {
  test('기존 노트와 샘플 기록을 저장소 변경 없이 통합 목록 행으로 변환한다', () => {
    const rows = buildUnifiedNoteRecords(
      [
        { id: 1, title: '기존 노트' },
        { id: 2, title: '개선 노트', noteType: NOTE_MENU_IMPROVEMENT_TYPE },
      ],
      [
        {
          id: 7,
          title: '치즈 샘플',
          recordType: SAMPLE_RECORD_TYPES.ISSUE,
          sampleNames: ['치즈 A'],
          description: '색상 이슈',
          result: '대체 필요',
          company: '공급사',
          tester: '홍길동',
        },
      ]
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: 1,
      _recordKind: 'note',
      _sourceId: 1,
      noteType: NOTE_MENU_DEVELOPMENT_TYPE,
    });
    expect(rows[1]).toMatchObject({
      id: 2,
      noteType: NOTE_MENU_IMPROVEMENT_TYPE,
    });
    expect(rows[2]).toMatchObject({
      id: 'sample:7',
      _recordKind: 'sample',
      _sourceId: 7,
      noteType: SAMPLE_RECORD_TYPES.ISSUE,
      recordType: SAMPLE_RECORD_TYPES.ISSUE,
      status: '보류',
      materials: '치즈 A',
      testContent: '색상 이슈',
      tasteEval: '대체 필요',
      managerEval: '',
    });
    expect(rows[2].issues).toContain('색상 이슈');
    expect(rows[2].issues).toContain('대체 필요');
    expect(rows[2].company).toBe('공급사');
    expect(rows[2].tester).toBe('홍길동');
  });

  test('레거시 이슈 유형과 sample: 표시 ID를 안전하게 정규화한다', () => {
    const row = sampleToUnifiedRecord({
      id: 12,
      title: '레거시 이슈',
      recordType: LEGACY_SAMPLE_RECORD_TYPES.ISSUE,
    });

    expect(row.noteType).toBe(SAMPLE_RECORD_TYPES.ISSUE);
    expect(isUnifiedSampleId(row.id)).toBe(true);
    expect(unifiedSampleSourceId(row)).toBe(12);
    expect(unifiedSampleSourceId(row.id)).toBe(12);
  });

  test('시장조사 기록을 연구일지가 읽는 통합 레코드로 변환한다(작업내용+사진 노출)', () => {
    const photos = [{ data: 'data:image/png;base64,abc', caption: '경쟁사 매장' }];
    const row = marketResearchToUnifiedRecord({
      id: 9,
      type: '타브랜드참고',
      date: '2026-07-14',
      brand: '경쟁사 A',
      title: '냉동 벌집 토핑',
      competitor: '경쟁사 A, 냉동 토핑',
      marketTrend: '가성비 트렌드 확산',
      referencePoint: '패키지 디자인 참고',
      developmentDirection: '자사 신메뉴 적용 검토',
      actionIdea: '원물 비교 테스트',
      tags: '냉동,벌집',
      photos,
    });

    expect(row.id).toBe('market:9');
    expect(isUnifiedMarketResearchId(row.id)).toBe(true);
    expect(isUnifiedMarketResearchRecord(row)).toBe(true);
    expect(unifiedMarketResearchSourceId(row)).toBe(9);
    expect(row._recordKind).toBe('market_research');
    expect(row.testDate).toBe('2026-07-14');
    expect(row.testContent).toContain('시장조사 기록 작성');
    expect(row.testContent).toContain('냉동 벌집 토핑');
    expect(row.tasteEval).toBe('가성비 트렌드 확산');
    expect(row.improvements).toContain('패키지 디자인 참고');
    expect(row.improvements).toContain('자사 신메뉴 적용 검토');
    expect(row.nextAction).toBe('원물 비교 테스트');
    expect(row.photos).toEqual(photos);
  });

  test('유형 필터는 허용된 통합 유형만 URL 필터로 사용한다', () => {
    expect(normalizeUnifiedTypeFilter(SAMPLE_RECORD_TYPES.SAMPLE_TEST)).toBe(
      SAMPLE_RECORD_TYPES.SAMPLE_TEST
    );
    expect(normalizeUnifiedTypeFilter('unknown')).toBe(NOTE_UNIFIED_TYPE_ALL);
    expect(noteTypeFilterHref(NOTE_UNIFIED_TYPE_ALL)).toBe('/note');
    expect(noteTypeFilterHref(SAMPLE_RECORD_TYPES.SAMPLE_TEST)).toContain('/note?type=');
  });
});
