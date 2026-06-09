export const CATEGORIES = ['피자', '사이드', '소스', '도우(엣지)', '토핑', '기타'];
export const NOTE_TYPES = ['아이디어', '메뉴테스트', '샘플', '개선', '제품변경'];
export const STATUSES = ['아이디어', '테스트중', '재테스트', '보고예정', '보류', '출시', '폐기'];

// 멀티 브랜드 — 노트 분류용. 단일 출처 lib/companies.js에서 파생.
import { COMPANIES } from '@/lib/companies';
export const NOTE_BRANDS = COMPANIES.map(c => ({ id: c.id, name: c.name }));

export const NOTE_STATUS = {
  IDEA: '아이디어',
  TESTING: '테스트중',
  RETEST: '재테스트',
  REPORTING: '보고예정',
  REVIEW: '보고',
  RELEASE: '출시',
  ABANDON: '폐기',
};

export const STATUS_COLORS = {
  아이디어: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  테스트중: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  재테스트: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  보고예정: { bg: '#F0EBFF', color: '#6B3FCB' },
  보류: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
  출시: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  폐기: { bg: 'var(--negative-soft)', color: 'var(--negative)' },
};

export const STATUS_BORDER = {
  아이디어: 'var(--text-4)',
  테스트중: 'var(--accent)',
  재테스트: 'var(--warn)',
  보고예정: '#6B3FCB',
  보류: 'var(--border-strong)',
  출시: 'var(--positive)',
  폐기: 'var(--negative)',
};
