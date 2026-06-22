/**
 * lib/change-log/index.js — 변경 이력 기록 (localStorage, 기록 전용 1차 구현)
 *
 * 최근 200건을 localStorage에 저장한다.
 * DB 스키마 변경 없이 동작한다.
 */
import { getActiveBrandId } from '@/lib/active-brand';

const LS_KEY = 'change_log_v1';
const MAX_ENTRIES = 200;

/**
 * @typedef {'ingredient:save'|'ingredient:delete'|'ingredient:bulk-delete'|
 *   'menu-master:save'|'menu-master:delete'|
 *   'recipe:save'|
 *   'upload:sales'|'upload:price'|'upload:shipment'|
 *   'backup:create'|'backup:restore'} ChangeType
 *
 * @typedef {Object} ChangeEntry
 * @property {string} id
 * @property {ChangeType} type
 * @property {string} label
 * @property {string|null} detail
 * @property {boolean} reversible
 * @property {string|null} reverseHint
 * @property {string} at
 * @property {string} brand
 */

const REVERSE_HINTS = {
  'ingredient:delete': '설정 > 브랜드 > 백업·복원',
  'ingredient:bulk-delete': '설정 > 브랜드 > 백업·복원',
  'menu-master:delete': '설정 > 브랜드 > 백업·복원',
  'upload:sales': null,
  'upload:price': null,
  'upload:shipment': null,
  'backup:restore': null,
};

const IS_REVERSIBLE = {
  'ingredient:save': false,
  'ingredient:delete': false,
  'ingredient:bulk-delete': false,
  'menu-master:save': false,
  'menu-master:delete': false,
  'recipe:save': false,
  'upload:sales': false,
  'upload:price': false,
  'upload:shipment': false,
  'backup:create': false,
  'backup:restore': false,
};

const CHANGE_TYPE_SET = new Set(Object.keys(IS_REVERSIBLE));

function cleanChangeType(type) {
  const value = typeof type === 'string' ? type : '';
  return CHANGE_TYPE_SET.has(value) ? value : '';
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function cleanNullableText(value) {
  if (value == null) return null;
  const text = cleanText(value);
  return text || null;
}

function cleanLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(MAX_ENTRIES, Math.floor(n));
}

function readEntries() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => {
        const type = cleanChangeType(entry.type);
        return {
          id: cleanText(entry.id),
          type,
          label: cleanText(entry.label),
          detail: cleanNullableText(entry.detail),
          reversible: IS_REVERSIBLE[type] ?? false,
          reverseHint: REVERSE_HINTS[type] ?? null,
          at: cleanText(entry.at),
          brand: cleanText(entry.brand) || 'main',
        };
      })
      .filter(entry => entry.id && entry.type && entry.label);
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  try {
    const safeEntries = Array.isArray(entries) ? entries : [];
    if (safeEntries.length === 0) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(safeEntries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage 쓰기 실패는 무시
  }
}

/** 이력 하나를 기록한다 */
export function logChange(type, label, detail = null) {
  try {
    const entries = readEntries();
    const cleanType = cleanChangeType(type);
    const cleanLabel = cleanText(label);
    if (!cleanType || !cleanLabel) return;
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: cleanType,
      label: cleanLabel,
      detail: cleanNullableText(detail),
      reversible: IS_REVERSIBLE[cleanType] ?? false,
      reverseHint: REVERSE_HINTS[cleanType] ?? null,
      at: new Date().toISOString(),
      brand: getActiveBrandId() || 'main',
    };
    const next = [entry, ...entries].slice(0, MAX_ENTRIES);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // localStorage 쓰기 실패는 무시
  }
}

/** 저장된 모든 이력 (최신순) */
export function getChangeLogs() {
  return readEntries();
}

/** 특정 브랜드·타입으로 필터링 */
export function filterChangeLogs({ brand, type, limit = 50 } = {}) {
  const cleanBrand = cleanText(brand);
  const cleanType = cleanChangeType(type);
  const safeLimit = cleanLimit(limit);
  return getChangeLogs()
    .filter(e => (!cleanBrand || e.brand === cleanBrand) && (!cleanType || e.type === cleanType))
    .slice(0, safeLimit);
}

/** 이력 삭제 — brand가 있으면 해당 브랜드만 삭제, 없으면 전체 삭제 */
export function clearChangeLogs(options = {}) {
  const hasBrandFilter =
    options &&
    typeof options === 'object' &&
    Object.prototype.hasOwnProperty.call(options, 'brand');
  const cleanBrand = hasBrandFilter ? cleanText(options.brand) : '';

  if (!hasBrandFilter || !cleanBrand) {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
    return;
  }

  writeEntries(readEntries().filter(entry => entry.brand !== cleanBrand));
}

// ── 편의 헬퍼 ──────────────────────────────────────────────────────────────

export function logIngredientSave(name, isNew) {
  logChange('ingredient:save', isNew ? `식자재 추가: ${name}` : `식자재 수정: ${name}`);
}

export function logIngredientDelete(name) {
  logChange('ingredient:delete', `식자재 삭제: ${name}`);
}

export function logIngredientBulkDelete(count) {
  logChange('ingredient:bulk-delete', `식자재 일괄 삭제 ${count}개`);
}

export function logMenuMasterSave(menuName, isNew) {
  logChange(
    'menu-master:save',
    isNew ? `메뉴마스터 추가: ${menuName}` : `메뉴마스터 수정: ${menuName}`
  );
}

export function logMenuMasterDelete(menuName) {
  logChange('menu-master:delete', `메뉴마스터 삭제: ${menuName}`);
}

export function logRecipeSave(menuName) {
  logChange('recipe:save', `레시피 저장: ${menuName}`);
}

export function logSalesUpload(fileName, rowCount) {
  logChange('upload:sales', `판매량 업로드: ${fileName}`, `${rowCount}행`);
}

export function logPriceUpload(fileName, rowCount) {
  logChange('upload:price', `단가 업로드: ${fileName}`, `${rowCount}행`);
}

export function logShipmentUpload(fileName, rowCount) {
  logChange('upload:shipment', `출고량 업로드: ${fileName}`, `${rowCount}행`);
}

export function logBackupCreate(label) {
  logChange('backup:create', `백업 생성: ${label}`);
}

export function logBackupRestore(label) {
  logChange('backup:restore', `백업 복원: ${label}`, '복원 후 되돌리기 불가');
}

/** 타입별 라벨 */
export const CHANGE_TYPE_LABEL = {
  'ingredient:save': '식자재 저장',
  'ingredient:delete': '식자재 삭제',
  'ingredient:bulk-delete': '식자재 일괄 삭제',
  'menu-master:save': '메뉴마스터 저장',
  'menu-master:delete': '메뉴마스터 삭제',
  'recipe:save': '레시피 저장',
  'upload:sales': '판매량 업로드',
  'upload:price': '단가 업로드',
  'upload:shipment': '출고량 업로드',
  'backup:create': '백업 생성',
  'backup:restore': '백업 복원',
};

/** 타입별 색상 */
export const CHANGE_TYPE_COLOR = {
  'ingredient:save': 'var(--positive)',
  'ingredient:delete': 'var(--negative)',
  'ingredient:bulk-delete': 'var(--negative)',
  'menu-master:save': 'var(--positive)',
  'menu-master:delete': 'var(--negative)',
  'recipe:save': 'var(--accent)',
  'upload:sales': 'var(--accent)',
  'upload:price': 'var(--accent)',
  'upload:shipment': 'var(--accent)',
  'backup:create': 'var(--positive)',
  'backup:restore': 'var(--warn)',
};
