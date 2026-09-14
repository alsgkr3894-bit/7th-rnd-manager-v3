/**
 * app/note/write/writeTypes.js — 노트 작성 유형(메뉴개발/개선/샘플테스트/제품이슈) 상수·변환 (순수)
 */
import { CATEGORIES, MENU_DEVELOPMENT_NOTE_TYPES } from '@/lib/note';
import { SAMPLE_RECORD_TYPES } from '@/lib/sample';
import { LEGACY_SAMPLE_RECORD_TYPES } from '@/lib/sample/constants';
import { SAMPLE_INIT } from '@/app/note/sample/_SampleFormBody';
import { todayLocalDate } from '@/lib/date/local-date';

export function normalizeStoredNoteCategory(value) {
  return CATEGORIES.includes(value) || value === '메뉴' ? value : CATEGORIES[0];
}

export const DEFAULT_FIRST_TEST_ROUND = '1';
export const WRITE_TYPES = {
  MENU_DEVELOPMENT: '메뉴개발',
  MENU_IMPROVEMENT: '메뉴개선',
  SAMPLE_TEST: '샘플테스트',
  PRODUCT_ISSUE: '제품이슈',
};
export const WRITE_TYPE_OPTIONS = [
  WRITE_TYPES.MENU_DEVELOPMENT,
  WRITE_TYPES.MENU_IMPROVEMENT,
  WRITE_TYPES.SAMPLE_TEST,
  WRITE_TYPES.PRODUCT_ISSUE,
];
export const SAMPLE_RECORD_TYPE_BY_WRITE_TYPE = {
  [WRITE_TYPES.SAMPLE_TEST]: SAMPLE_RECORD_TYPES.SAMPLE_TEST,
  [WRITE_TYPES.PRODUCT_ISSUE]: SAMPLE_RECORD_TYPES.ISSUE,
};
export const WRITE_TYPE_PARAM_MAP = {
  'menu-development': WRITE_TYPES.MENU_DEVELOPMENT,
  development: WRITE_TYPES.MENU_DEVELOPMENT,
  menu: WRITE_TYPES.MENU_DEVELOPMENT,
  'menu-improvement': WRITE_TYPES.MENU_IMPROVEMENT,
  improvement: WRITE_TYPES.MENU_IMPROVEMENT,
  sample: WRITE_TYPES.SAMPLE_TEST,
  'sample-test': WRITE_TYPES.SAMPLE_TEST,
  issue: WRITE_TYPES.PRODUCT_ISSUE,
  'product-issue': WRITE_TYPES.PRODUCT_ISSUE,
};

export function isMenuWriteType(value) {
  return value === WRITE_TYPES.MENU_DEVELOPMENT || value === WRITE_TYPES.MENU_IMPROVEMENT;
}

export function writeTypeFromParam(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  return WRITE_TYPE_PARAM_MAP[key] || null;
}

export function writeTypeFromSample(sample) {
  return sample?.recordType === SAMPLE_RECORD_TYPES.ISSUE ||
    sample?.recordType === LEGACY_SAMPLE_RECORD_TYPES.ISSUE
    ? WRITE_TYPES.PRODUCT_ISSUE
    : WRITE_TYPES.SAMPLE_TEST;
}

export function noteListTypeHref(recordType) {
  return `/note?type=${encodeURIComponent(recordType || SAMPLE_RECORD_TYPES.SAMPLE_TEST)}`;
}

export function withDefaultFirstTestRound(value = {}) {
  const testRound = String(value.testRound || '').trim() || DEFAULT_FIRST_TEST_ROUND;
  return { ...value, testRound };
}

export function makeSampleInitial(writeType = WRITE_TYPES.SAMPLE_TEST) {
  return {
    ...SAMPLE_INIT,
    recordType: SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType] || SAMPLE_RECORD_TYPES.SAMPLE_TEST,
    testDate: todayLocalDate(),
  };
}
