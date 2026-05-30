export const KEYS = {
  // 메뉴개발노트
  NOTE_SORT:             'v3:note-sort',
  NOTE_VIEW:             'v3:note-view',
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

  // 홈
  HOME_WIDGETS:          'v3:home-widgets',
  HOME_NOTE_DRAFT:       'v3:note-draft',

  // 앱 전역
  THEME:                 'v3:theme',
  SIDEBAR_OPEN:          'v3:sidebar-open',
  PALETTE_RECENT:        'v3:palette-recent',
};
