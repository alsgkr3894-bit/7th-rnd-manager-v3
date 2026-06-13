export const KEYS = {
  // 메뉴개발노트
  NOTE_SORT: 'v3:note-sort',
  NOTE_VIEW: 'v3:note-view',
  NOTE_SEARCH: 'v3:note-search',
  NOTE_STATUS: 'v3:note-status',
  NOTE_BRAND_FILTER: 'v3:note-brand-filter',
  NOTE_PINS: 'v3:note-pins',
  NOTE_PRESETS: 'v3:note-presets',
  NOTE_SEARCH_HISTORY: 'v3:note-search-history',
  NOTE_DRAFT_WRITE: 'v3:note-draft-write',
  NOTE_DRAFT: id => `v3:note-draft-${id}`,
  NOTE_FROM: 'v3:note-from',
  NOTE_LAST_CATEGORY: 'v3:note_lastCategory',
  NOTE_CALENDAR_CHECKLIST: 'v3:note-calendar-checklist',

  // 샘플기록
  SAMPLE_SORT: 'v3:sample-sort',
  SAMPLE_VIEW: 'v3:sample-view',
  SAMPLE_SEARCH_HISTORY: 'v3:sample-search-history',
  SAMPLE_FROM_NOTE: 'v3:sample-from-note',

  // 원가계산
  RECIPE_SORT: 'v3:recipe-sort',
  COST_PLATFORMS: 'v3:cost-platforms',
  COST_RECIPE_SEARCH: 'v3:cost-recipe-search',
  MARGIN_CAT_FILTER: 'v3:margin-cat-filter',
  MARGIN_COST_WARN: 'v3:margin-cost-warn',
  MARGIN_COST_CRIT: 'v3:margin-cost-crit',
  MENU_PRICE_CAT_FILTER: 'v3:menu-price-cat-filter',

  // 재료
  INGREDIENT_LAST_UNIT_TYPE: 'v3:ingredient_lastUnitType',
  INGREDIENT_CAT_FILTER: 'v3:ingredient-cat-filter',
  INGREDIENT_LIST_CAT_FILTER: 'v3:ingredient-list-cat-filter',
  INGREDIENT_USAGE_HIDDEN: 'v3:ingredient-usage-hidden',
  INGREDIENT_USAGE_EXCL_MENUS: 'v3:ingredient-usage-excl-menus',

  // 홈
  HOME_WIDGETS: 'v3:home-widgets',
  HOME_WIDGET_COLLAPSED: 'v3:home-widget-collapsed',
  HOME_WIDGET_ORDER: 'v3:home-widget-order',
  HOME_WIDGET_FAVORITES: 'v3:home-widget-favorites',
  HOME_WIDGET_FAV_ONLY: 'v3:home-widget-fav-only',
  HOME_NOTE_DRAFT: 'v3:home-quick-note-draft',
  HOME_TODO_DONE: 'v3:home-todo-done',

  // 앱 전역
  THEME: 'v3:theme',
  SIDEBAR_OPEN: 'v3:sidebar-open',
  PALETTE_RECENT: 'v3:palette-recent',
  PROFILE: 'v3:profile',
  LAST_WL_PRUNE: 'v3:last-wl-prune',
};

function _ssGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function _ssSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch {}
}
function _ssRemove(key) {
  try { sessionStorage.removeItem(key); } catch {}
}

/** 개발노트 작성 화면으로 이동 시 원본 노트 ID 전달 */
export function setNoteFrom(id) { _ssSet(KEYS.NOTE_FROM, String(id)); }
export function consumeNoteFrom() {
  const v = _ssGet(KEYS.NOTE_FROM);
  _ssRemove(KEYS.NOTE_FROM);
  return v;
}

/** 샘플기록 작성 화면으로 이동 시 원본 노트 데이터 전달 */
export function setSampleFromNote(data) {
  try { _ssSet(KEYS.SAMPLE_FROM_NOTE, JSON.stringify(data)); } catch {}
}
export function consumeSampleFromNote() {
  const raw = _ssGet(KEYS.SAMPLE_FROM_NOTE);
  if (!raw) return null;
  _ssRemove(KEYS.SAMPLE_FROM_NOTE);
  try { return JSON.parse(raw); } catch { return null; }
}

/** 홈 빠른 노트 초안을 작성 화면으로 전달 */
export function setHomeNoteDraft(text) {
  try { sessionStorage.setItem(KEYS.HOME_NOTE_DRAFT, text); }
  catch (err) { console.warn('[Home] storage access failed:', err); }
}
export function consumeHomeNoteDraft() {
  const v = _ssGet(KEYS.HOME_NOTE_DRAFT);
  if (!v) return null;
  _ssRemove(KEYS.HOME_NOTE_DRAFT);
  return v;
}
