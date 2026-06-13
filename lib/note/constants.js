export const CATEGORIES = ['피자', '사이드', '소스', '도우(엣지)', '기타'];
export const NOTE_TYPES = ['아이디어', '메뉴테스트', '샘플테스트', '샘플', '개선', '제품변경'];
export const STATUSES = [
  '아이디어',
  '샘플테스트',
  '메뉴테스트',
  '보고예정',
  '재테스트',
  '출시예정',
  '보류',
  '출시',
  '폐기',
  '테스트중', // 레거시 — 기존 노트 표시 유지용
];

// 멀티 브랜드 — 노트 분류용. 단일 출처 lib/companies.js에서 파생.
import { COMPANIES } from '@/lib/companies';
export const NOTE_BRANDS = COMPANIES.map(c => ({ id: c.id, name: c.name }));

export const NOTE_STATUS = {
  IDEA: '아이디어',
  SAMPLE_TEST: '샘플테스트',
  MENU_TEST: '메뉴테스트',
  TESTING: '테스트중', // 레거시
  RETEST: '재테스트',
  REPORTING: '보고예정',
  RELEASE_READY: '출시예정',
  REVIEW: '보고',
  RELEASE: '출시',
  ABANDON: '폐기',
};

export const STATUS_COLORS = {
  아이디어: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  샘플테스트: { bg: '#FEF3C7', color: '#D97706' },
  메뉴테스트: { bg: '#E0E7FF', color: '#4338CA' },
  테스트중: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' }, // 레거시
  재테스트: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  보고예정: { bg: '#F0EBFF', color: '#6B3FCB' },
  출시예정: { bg: '#E0F2FE', color: '#0369A1' },
  보류: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
  출시: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  폐기: { bg: 'var(--negative-soft)', color: 'var(--negative)' },
};

export const STATUS_BORDER = {
  아이디어: 'var(--text-4)',
  샘플테스트: '#D97706',
  메뉴테스트: '#4338CA',
  테스트중: 'var(--accent)', // 레거시
  재테스트: 'var(--warn)',
  보고예정: '#6B3FCB',
  출시예정: '#0284C7',
  보류: 'var(--border-strong)',
  출시: 'var(--positive)',
  폐기: 'var(--negative)',
};
