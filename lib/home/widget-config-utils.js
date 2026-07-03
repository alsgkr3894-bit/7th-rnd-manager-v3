/** 드래그 단위 위젯 행 정의 (row id + 포함된 위젯 key 목록 + 라벨) */
export const HOME_WIDGET_ROWS = [
  { id: 'recent', keys: ['recent'], label: '최근 방문' },
  { id: 'briefing', keys: ['briefing'], label: '이번 달 브리핑' },
  { id: 'kpi', keys: ['kpi'], label: 'KPI 지표' },
  { id: 'freshness', keys: ['freshness'], label: '데이터 신선도' },
  { id: 'health', keys: ['health'], label: '모듈별 헬스체크' },
  { id: 'todo-pair', keys: ['todo', 'unmatched'], label: '오늘 할 일 · 미매칭' },
  { id: 'pipeline-pair', keys: ['pipeline', 'schedule'], label: '파이프라인 · 주간 일정' },
  { id: 'ranks', keys: ['ranks'], label: '판매 순위' },
  { id: 'charts', keys: ['charts'], label: '차트' },
  { id: 'price-pair', keys: ['pricechange', 'costalert'], label: '단가 변동 · 원가율 경보' },
  { id: 'quicknote', keys: ['quicknote'], label: '빠른 메모' },
  { id: 'notes-pair', keys: ['samples'], label: '샘플 기록' },
  { id: 'heat-pair', keys: ['heatmap', 'quickreport'], label: '노트 히트맵 · 보고서 빠른 생성' },
  { id: 'activities', keys: ['activities'], label: '최근 활동' },
];

/** 개별 위젯 toggle용 정의 (기존 호환) */
export const HOME_WIDGET_DEFS = HOME_WIDGET_ROWS.flatMap(row =>
  row.keys.map(key => ({ key, label: row.label }))
);

export const DEFAULT_ORDER = HOME_WIDGET_ROWS.map(r => r.id);
export const ALL_ROW_IDS = new Set(DEFAULT_ORDER);
export const ALL_WIDGET_KEYS = new Set(HOME_WIDGET_ROWS.flatMap(r => r.keys));

/** config 객체에서 알 수 없는 key나 boolean이 아닌 값을 제거 */
export function sanitizeWidgetConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ALL_WIDGET_KEYS.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** collapsed 객체에서 알 수 없는 key나 boolean이 아닌 값을 제거 */
export function sanitizeWidgetCollapsed(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ALL_WIDGET_KEYS.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** 저장된 rowId 배열을 DEFAULT_ORDER와 reconcile — 불명 제거, 누락 추가 */
export function reconcileWidgetOrder(saved) {
  const source = Array.isArray(saved) ? saved : [];
  const kept = [...new Set(source.filter(id => ALL_ROW_IDS.has(id)))];
  const missing = DEFAULT_ORDER.filter(id => !kept.includes(id));
  return [...kept, ...missing];
}

/** 저장된 favorites 배열 reconcile */
export function reconcileWidgetFavorites(saved) {
  const source = Array.isArray(saved) ? saved : [];
  return [...new Set(source.filter(id => ALL_ROW_IDS.has(id)))];
}

/** 위젯 key 배열에서 유효한 key만 필터링 */
export function normalizeWidgetKeys(keys) {
  return Array.isArray(keys) ? keys.filter(key => ALL_WIDGET_KEYS.has(key)) : [];
}

/** 현재 config 기준 보이는 행 수 (빈 대시보드 방지용) */
export function visibleRowCount(cfg) {
  const cleanConfig = sanitizeWidgetConfig(cfg);
  return HOME_WIDGET_ROWS.filter(row => row.keys.every(k => cleanConfig[k] !== false)).length;
}
