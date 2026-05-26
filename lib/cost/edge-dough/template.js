/**
 * lib/cost/edge-dough/template.js — 엣지·도우 마스터 시드
 *
 * CLAUDE.md 정책 5종:
 *   - 치즈크러스트 L / R
 *   - 골드스윗크러스트 L / R
 *   - 씬도우 L (R 없음)
 */

export const EDGE_TYPES = ['치즈크러스트', '골드스윗크러스트', '씬도우'];

/** 엣지 유형별 prefix (코드 발급용) */
export const EDGE_CODE_PREFIX = {
  '치즈크러스트':     'CC',
  '골드스윗크러스트': 'GS',
  '씬도우':           'TH',
};

export function edgeCodeOf(edgeType, size) {
  const prefix = EDGE_CODE_PREFIX[edgeType] || 'ED';
  return size ? `ED-${prefix}-${size}` : `ED-${prefix}`;
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
