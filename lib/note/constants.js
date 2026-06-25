export const CATEGORIES = ['피자', '사이드', '소스', '도우(엣지)', '기타'];
export const JOURNAL_NOTE_TYPE = '연구일지';
export const NOTE_TYPES = ['메뉴개발', '메뉴개선', '샘플', JOURNAL_NOTE_TYPE];
export const STATUSES = ['테스트', '재테스트', '출시예정', '보류', '출시', '폐기'];

// 멀티 브랜드 — 노트 분류용. 단일 출처 lib/companies.js에서 파생.
import { COMPANIES } from '@/lib/companies';
export const NOTE_BRANDS = COMPANIES.map(c => ({ id: c.id, name: c.name }));

export const NOTE_STATUS = {
  TEST: '테스트',
  IDEA: '아이디어', // 레거시
  SAMPLE_TEST: '샘플테스트', // 레거시
  MENU_TEST: '테스트',
  TESTING: '테스트중', // 레거시
  RETEST: '재테스트',
  REPORTING: '보고예정', // 레거시
  RELEASE_READY: '출시예정',
  REVIEW: '보고',
  RELEASE: '출시',
  ABANDON: '폐기',
};

export const STATUS_COLORS = {
  테스트: { bg: '#E0E7FF', color: '#4338CA' },
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
  테스트: '#4338CA',
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
  if (raw === '보고예정' || raw === '보고') return '출시예정';
  return STATUSES.includes(raw) ? raw : raw;
}

export function normalizeNoteRecord(note) {
  if (!note || typeof note !== 'object') return note;
  return {
    ...note,
    noteType: normalizeNoteType(note.noteType),
    status: normalizeNoteStatus(note.status),
  };
}
