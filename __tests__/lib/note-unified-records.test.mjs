import {
  NOTE_MENU_DEVELOPMENT_TYPE,
  NOTE_MENU_IMPROVEMENT_TYPE,
  NOTE_UNIFIED_TYPE_ALL,
  buildUnifiedNoteRecords,
  isUnifiedSampleId,
  normalizeUnifiedTypeFilter,
  noteTypeFilterHref,
  sampleToUnifiedRecord,
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
    });
    expect(rows[2].testContent).toContain('색상 이슈');
    expect(rows[2].testContent).toContain('대체 필요');
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

  test('유형 필터는 허용된 통합 유형만 URL 필터로 사용한다', () => {
    expect(normalizeUnifiedTypeFilter(SAMPLE_RECORD_TYPES.SAMPLE_TEST)).toBe(
      SAMPLE_RECORD_TYPES.SAMPLE_TEST
    );
    expect(normalizeUnifiedTypeFilter('unknown')).toBe(NOTE_UNIFIED_TYPE_ALL);
    expect(noteTypeFilterHref(NOTE_UNIFIED_TYPE_ALL)).toBe('/note');
    expect(noteTypeFilterHref(SAMPLE_RECORD_TYPES.SAMPLE_TEST)).toContain('/note?type=');
  });
});
