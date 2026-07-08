export const CATEGORIES = ['피자', '사이드', '소스', '도우(엣지)', '기타'];
export const JOURNAL_NOTE_TYPE = '연구일지';
export const NOTE_TYPES = ['메뉴개발', '메뉴개선', '샘플', JOURNAL_NOTE_TYPE];
export const MENU_DEVELOPMENT_NOTE_TYPES = NOTE_TYPES.filter(
  type => type !== '샘플' && type !== JOURNAL_NOTE_TYPE
);
export const LIMITED_MENU_CATEGORY_BRANDS = ['china4', 'icheon'];
export const LIMITED_MENU_CATEGORIES = ['메뉴', '사이드'];
export const STATUSES = ['테스트', '테스트예정', '보류', '출시', '폐기'];

// 멀티 브랜드 — 노트 분류용. 단일 출처 lib/companies.js에서 파생.
import { COMPANIES } from '@/lib/companies';
export const NOTE_BRANDS = COMPANIES.map(c => ({ id: c.id, name: c.name }));

export const NOTE_STATUS = {
  TEST: '테스트',
  TEST_SCHEDULED: '테스트예정',
  IDEA: '아이디어', // 레거시
  SAMPLE_TEST: '샘플테스트', // 레거시
  MENU_TEST: '테스트',
  TESTING: '테스트중', // 레거시
  REVIEW: '보고',
  RELEASE: '출시',
  ABANDON: '폐기',
};

export const STATUS_COLORS = {
  테스트: { bg: '#E0E7FF', color: '#4338CA' },
  테스트예정: { bg: '#FEF3C7', color: '#B45309' },
  아이디어: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  샘플테스트: { bg: '#FEF3C7', color: '#D97706' },
  메뉴테스트: { bg: '#E0E7FF', color: '#4338CA' },
  테스트중: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' }, // 레거시
  보류: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
  출시: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  폐기: { bg: 'var(--negative-soft)', color: 'var(--negative)' },
};

export const STATUS_BORDER = {
  테스트: '#4338CA',
  테스트예정: '#D97706',
  아이디어: 'var(--text-4)',
  샘플테스트: '#D97706',
  메뉴테스트: '#4338CA',
  테스트중: 'var(--accent)', // 레거시
  보류: 'var(--border-strong)',
  출시: 'var(--positive)',
  폐기: 'var(--negative)',
};

export function normalizeNoteType(value) {
  if (value != null && typeof value !== 'string' && typeof value !== 'number') return '';
  const raw = String(value || '').trim();
  if (!raw) return NOTE_TYPES[0];
  if (raw === '아이디어' || raw === '메뉴테스트') return '메뉴개발';
  if (raw === '개선' || raw === '제품변경') return '메뉴개선';
  if (raw === '샘플테스트') return '샘플';
  return NOTE_TYPES.includes(raw) ? raw : raw;
}

export function normalizeNoteStatus(value) {
  if (value != null && typeof value !== 'string' && typeof value !== 'number') return '';
  const raw = String(value || '').trim();
  if (!raw) return STATUSES[0];
  if (raw === '아이디어' || raw === '샘플테스트' || raw === '메뉴테스트' || raw === '테스트중') {
    return '테스트';
  }
  if (raw.replace(/\s+/g, '') === '테스트예정') return '테스트예정';
  if (raw === '재테스트') return '테스트';
  if (raw === '출시예정' || raw === '보고예정' || raw === '보고') return '보류';
  return STATUSES.includes(raw) ? raw : raw;
}

export function getNoteCategoryOptionsForBrand(brandId) {
  return LIMITED_MENU_CATEGORY_BRANDS.includes(String(brandId || ''))
    ? LIMITED_MENU_CATEGORIES
    : CATEGORIES;
}

export function normalizeNoteCategoryForBrand(value, brandId) {
  const options = getNoteCategoryOptionsForBrand(brandId);
  const raw = String(value || '').trim();
  return options.includes(raw) ? raw : options[0];
}

export function normalizeNoteRecord(note) {
  if (!note || typeof note !== 'object') return note;
  return {
    ...note,
    noteType: normalizeNoteType(note.noteType),
    status: normalizeNoteStatus(note.status),
  };
}
