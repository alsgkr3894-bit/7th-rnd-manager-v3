import { describe, expect, test } from '@jest/globals';
import {
  isNoteFormValid,
  isSampleFormValid,
  resolveSampleRecordType,
} from '../../app/note/write/noteWriteUtils.js';
import { SAMPLE_RECORD_TYPES } from '../../lib/sample/index.js';

// writeTypes.js는 jsx 컴포넌트(SAMPLE_INIT)를 재수출하므로, jsx 트랜스폼이 없는
// 이 테스트 환경에서는 import하지 않는다. fallbackRecordType은 호출부(useNoteWriteController)가
// SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType]로 넘기는 값을 그대로 흉내낸 문자열로 대신한다.
describe('resolveSampleRecordType', () => {
  test('폼에 recordType이 있으면 그대로 사용한다', () => {
    expect(resolveSampleRecordType({ recordType: '커스텀' }, SAMPLE_RECORD_TYPES.SAMPLE_TEST)).toBe(
      '커스텀'
    );
  });

  test('폼에 없으면 전달된 fallback(작성 유형 매핑값)을 사용한다', () => {
    expect(resolveSampleRecordType({}, SAMPLE_RECORD_TYPES.ISSUE)).toBe(SAMPLE_RECORD_TYPES.ISSUE);
  });

  test('fallback도 없으면 기본 샘플테스트로 떨어진다', () => {
    expect(resolveSampleRecordType({}, undefined)).toBe(SAMPLE_RECORD_TYPES.SAMPLE_TEST);
    expect(resolveSampleRecordType(null, undefined)).toBe(SAMPLE_RECORD_TYPES.SAMPLE_TEST);
  });
});

describe('isSampleFormValid', () => {
  test('제목이 있으면 유효하다', () => {
    expect(isSampleFormValid({ title: '샘플 제목' })).toBe(true);
  });

  test('제목이 공백뿐이거나 없으면 무효하다', () => {
    expect(isSampleFormValid({ title: '   ' })).toBe(false);
    expect(isSampleFormValid({})).toBe(false);
    expect(isSampleFormValid(null)).toBe(false);
  });
});

describe('isNoteFormValid', () => {
  test('제목/메뉴명/메뉴코드 중 하나 + 테스트 내용이 있으면 유효하다', () => {
    expect(isNoteFormValid({ title: '제목', testContent: '내용' })).toBe(true);
    expect(isNoteFormValid({ menuName: '메뉴명', testContent: '내용' })).toBe(true);
    expect(isNoteFormValid({ menuCode: 'M001', testContent: '내용' })).toBe(true);
  });

  test('제목/메뉴명/메뉴코드가 모두 없으면 무효하다', () => {
    expect(isNoteFormValid({ testContent: '내용' })).toBe(false);
  });

  test('테스트 내용이 없으면 무효하다', () => {
    expect(isNoteFormValid({ title: '제목', testContent: '   ' })).toBe(false);
    expect(isNoteFormValid({ title: '제목' })).toBe(false);
  });
});
