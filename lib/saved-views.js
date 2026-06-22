/**
 * lib/saved-views.js — localStorage 기반 필터·뷰 저장
 *
 * 각 화면별로 현재 필터 조합을 이름 붙여 저장하고 재적용한다.
 * 브랜드별로 분리 저장된다.
 */
import { getActiveBrandId } from '@/lib/active-brand';

const LS_PREFIX = 'saved_views_v1';
const MAX_VIEWS = 50;

function cleanScreen(screen) {
  const text = String(screen ?? '')
    .trim()
    .replace(/[^A-Za-z0-9:_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return text || null;
}

function key(screen) {
  const clean = cleanScreen(screen);
  if (!clean) return null;
  const brand = getActiveBrandId() || 'main';
  return `${LS_PREFIX}__${brand}__${clean}`;
}

function defaultKey(screen) {
  const clean = cleanScreen(screen);
  if (!clean) return null;
  const brand = getActiveBrandId() || 'main';
  return `${LS_PREFIX}_default__${brand}__${clean}`;
}

function readAll(screen) {
  try {
    const storageKey = key(screen);
    if (!storageKey) return [];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const byName = new Map();
    for (const item of parsed) {
      const name = String(item?.name ?? '').trim();
      if (!name) continue;
      byName.set(name, {
        name,
        filters: item?.filters && typeof item.filters === 'object' ? item.filters : {},
        savedAt: item?.savedAt || null,
      });
    }
    return [...byName.values()];
  } catch {
    return [];
  }
}

function writeAll(screen, views) {
  try {
    const storageKey = key(screen);
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(views.slice(0, MAX_VIEWS)));
  } catch {
    // localStorage 쓰기 실패(용량 초과 등)는 조용히 무시
  }
}

/** 화면의 저장된 뷰 목록 */
export function getSavedViews(screen) {
  return readAll(screen);
}

/**
 * 현재 필터를 이름 붙여 저장한다.
 * 같은 이름이 있으면 덮어쓴다.
 * @param {string} screen - 화면 식별자 (예: 'ingredient-manage')
 * @param {string} name - 저장 이름
 * @param {object} filters - 저장할 필터 객체 (화면별로 자유 형식)
 */
export function saveView(screen, name, filters) {
  const cleanName = String(name ?? '').trim();
  if (!cleanScreen(screen) || !cleanName) return;
  const views = readAll(screen);
  const idx = views.findIndex(v => v.name === cleanName);
  const entry = { name: cleanName, filters, savedAt: Date.now() };
  if (idx >= 0) views[idx] = entry;
  else views.push(entry);
  writeAll(screen, views);
}

/** 저장된 뷰 삭제 */
export function deleteView(screen, name) {
  const cleanName = String(name ?? '').trim();
  const views = readAll(screen).filter(v => v.name !== cleanName);
  writeAll(screen, views);
  if (getDefaultView(screen) === cleanName) setDefaultView(screen, null);
}

/** 기본 뷰 지정 (name이 null이면 해제) */
export function setDefaultView(screen, name) {
  try {
    const k = defaultKey(screen);
    if (!k) return;
    const cleanName = String(name ?? '').trim();
    if (!cleanName) localStorage.removeItem(k);
    else localStorage.setItem(k, cleanName);
  } catch {
    // ignore
  }
}

/** 기본 뷰 이름 반환 (없으면 null) */
export function getDefaultView(screen) {
  try {
    const k = defaultKey(screen);
    if (!k) return null;
    return localStorage.getItem(k) || null;
  } catch {
    return null;
  }
}

/** 이름 변경 */
export function renameView(screen, oldName, newName) {
  const cleanOldName = String(oldName ?? '').trim();
  const cleanNewName = String(newName ?? '').trim();
  if (!cleanNewName || !cleanOldName || cleanOldName === cleanNewName) return;
  const views = readAll(screen);
  const targetIndex = views.findIndex(v => v.name === cleanOldName);
  if (targetIndex < 0) return;
  const target = views[targetIndex];
  const renamed = { ...target, name: cleanNewName };
  const next = views
    .map((v, index) => (index === targetIndex ? renamed : v))
    .filter((v, index) => v.name !== cleanNewName || index === targetIndex);
  writeAll(screen, next);
  // 기본뷰가 이 이름이면 갱신
  if (getDefaultView(screen) === cleanOldName) setDefaultView(screen, cleanNewName);
}
