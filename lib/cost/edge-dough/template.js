/**
 * lib/cost/edge-dough/template.js — 엣지·도우 마스터 시드
 *
 * CLAUDE.md 정책 5종:
 *   - 치즈크러스트 L / R
 *   - 골드스윗크러스트 L / R
 *   - 씬도우 L (R 없음)
 */

export const EDGE_TYPES = ['치즈크러스트', '골드스윗크러스트', '씬도우'];

/** 원가마진표에서 별도 행으로 파생되는 기본 엣지 유형 (레거시 fallback용) */
export const EXPAND_EDGE_TYPES = ['치즈크러스트', '골드스윗크러스트'];

/** 마진표 확장 제외 기본값 — 씬도우는 기본 도우 대체(추가형 아님) */
export const NON_EXPAND_EDGE_TYPES = ['씬도우'];

/** 엣지 유형별 prefix (코드 발급용) */
export const EDGE_CODE_PREFIX = {
  '치즈크러스트':     'CC',
  '골드스윗크러스트': 'GS',
  '씬도우':           'TH',
};

/** 마진표 파생행 메뉴코드 접미사 기본값 (치즈크러스트→C, 골드스윗→G) */
export const EDGE_MARGIN_SUFFIX = {
  '치즈크러스트':     'C',
  '골드스윗크러스트': 'G',
};

export function edgeCodeOf(edgeType, size) {
  const prefix = EDGE_CODE_PREFIX[edgeType] || 'ED';
  return size ? `ED-${prefix}-${size}` : `ED-${prefix}`;
}

/** 엣지 유형의 마진표 확장 여부 기본값 (씬도우만 false) */
export function defaultExpandInMargin(edgeType) {
  return !NON_EXPAND_EDGE_TYPES.includes((edgeType || '').trim());
}

/** 엣지 유형의 마진표 접미사 기본값 (지정 없으면 유형 첫 글자) */
export function defaultMarginSuffix(edgeType) {
  const t = (edgeType || '').trim();
  return EDGE_MARGIN_SUFFIX[t] || t.charAt(0) || 'E';
}

/** 기본 5종 시드 — 구성품은 빈 배열로 두고 사용자가 채움 */
export const EDGE_DOUGH_SEED = [
  { edgeType: '치즈크러스트',     size: 'L' },
  { edgeType: '치즈크러스트',     size: 'R' },
  { edgeType: '골드스윗크러스트', size: 'L' },
  { edgeType: '골드스윗크러스트', size: 'R' },
  { edgeType: '씬도우',           size: 'L' },
].map(item => ({
  ...item,
  edgeCode: edgeCodeOf(item.edgeType, item.size),
  components: [],
  note: '',
}));
