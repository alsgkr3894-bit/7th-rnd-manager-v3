export const KEYS = {
  // 메뉴개발노트
  NOTE_SORT:             'v3:note-sort',
  NOTE_VIEW:             'v3:note-view',
  NOTE_SEARCH:           'v3:note-search',
  NOTE_STATUS:           'v3:note-status',
  NOTE_PINS:             'v3:note-pins',
  NOTE_PRESETS:          'v3:note-presets',
  NOTE_SEARCH_HISTORY:   'v3:note-search-history',
  NOTE_DRAFT_WRITE:      'v3:note-draft-write',
  NOTE_DRAFT:            (id) => `v3:note-draft-${id}`,
  NOTE_FROM:             'v3:note-from',

  // 샘플기록
  SAMPLE_SORT:           'v3:sample-sort',
  SAMPLE_VIEW:           'v3:sample-view',
  SAMPLE_SEARCH_HISTORY: 'v3:sample-search-history',
  SAMPLE_FROM_NOTE:      'v3:sample-from-note',

  // 원가계산
  RECIPE_SORT:           'v3:recipe-sort',
  COST_PLATFORMS:        'v3:cost-platforms',
  COST_RECIPE_SEARCH:    'v3:cost-recipe-search',
  MARGIN_CAT_FILTER:     'v3:margin-cat-filter',

  // 재료
  INGREDIENT_CAT_FILTER: 'v3:ingredient-cat-filter',

  // 홈
  HOME_WIDGETS:          'v3:home-widgets',
  HOME_NOTE_DRAFT:       'v3:home-quick-note-draft',

  // 앱 전역
  THEME:                 'v3:theme',
  SIDEBAR_OPEN:          'v3:sidebar-open',
  PALETTE_RECENT:        'v3:palette-recent',
  PROFILE:               'v3:profile',
  LAST_WL_PRUNE:         'v3:last-wl-prune',
};
