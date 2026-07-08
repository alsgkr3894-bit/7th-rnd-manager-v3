export const SAMPLE_RECORD_LABEL = '식자재 이슈 및 테스트 /샘플기록';
export const SAMPLE_RECORD_FILE_LABEL = '식자재 이슈 및 테스트_샘플기록';
export const SAMPLE_RECORD_REPORT_TITLE = `${SAMPLE_RECORD_LABEL} PDF 보고서`;

export const SAMPLE_RECORD_TYPES = {
  SAMPLE_TEST: '샘플테스트',
  ISSUE: '제품이슈',
};

export const LEGACY_SAMPLE_RECORD_TYPES = {
  ISSUE: '이슈',
};

export const SAMPLE_RECORD_TYPE_OPTIONS = [
  SAMPLE_RECORD_TYPES.SAMPLE_TEST,
  SAMPLE_RECORD_TYPES.ISSUE,
];

export const SAMPLE_CATEGORIES = ['RND', '토핑식자재', '사이드식자재', '소스', '기타'];

export const RATING_LABELS = { 1: '별로', 2: '보통', 3: '좋음', 4: '매우좋음', 5: '최고' };

export const RATING_COLOR = {
  1: 'var(--negative)',
  2: 'var(--text-3)',
  3: 'var(--warn)',
  4: 'var(--accent-text)',
  5: 'var(--positive)',
};
