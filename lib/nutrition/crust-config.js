/**
 * lib/nutrition/crust-config.js — 영양성분·알레르기 모듈의 크러스트/엣지 단일 출처
 *
 * nutrition 도메인에서만 사용. cost 모듈의 edgeType 명명법(치즈크러스트·골드스윗크러스트·씬도우)과
 * 이 파일의 L/R 포함 명명법(치즈크러스트L·골드스윗L…)은 의도적으로 다른 체계다 — 통합 금지.
 *
 * 모든 값은 기존 코드와 바이트 동일(동작 보존). 위치만 이동.
 */

/** 베이스 크러스트 4종 (nutrition_raw_values의 crustType 값) */
export const CRUST_TYPES = ['석쇠L', '석쇠R', '씬바사삭L', '씬바사삭R'];

/** 엣지 4종 코드 */
export const EDGE_CODES = ['치즈크러스트L', '치즈크러스트R', '골드스윗L', '골드스윗R'];

/** 엣지 표시명 맵 */
export const EDGE_NAMES = {
  치즈크러스트L: '치즈크러스트 L',
  치즈크러스트R: '치즈크러스트 R',
  골드스윗L: '골드스윗 L',
  골드스윗R: '골드스윗 R',
};

/**
 * 석쇠 side별 베이스 크러스트 키.
 * calcAllResults 내부의 매직 '석쇠L'/'석쇠R' 리터럴 대신 참조해
 * CRUST_TYPES와의 수동 동기화 의존을 제거한다.
 */
export const SIDE_BASE_CRUST = { L: '석쇠L', R: '석쇠R' };

/**
 * 석쇠 베이스 + 엣지 4종 조합 (side: 'L' → 석쇠L, 'R' → 석쇠R).
 * 기존 values/store.js의 비공개 EDGE_VARIANTS를 export로 승격.
 */
export const EDGE_VARIANTS = [
  { crustType: '치즈크러스트L', edgeCode: '치즈크러스트L', side: 'L' },
  { crustType: '치즈크러스트R', edgeCode: '치즈크러스트R', side: 'R' },
  { crustType: '골드스윗L', edgeCode: '골드스윗L', side: 'L' },
  { crustType: '골드스윗R', edgeCode: '골드스윗R', side: 'R' },
];

/**
 * 알레르기 매트릭스용 크러스트 변형 4종.
 * 기존 allergen/page.jsx의 로컬 CRUST_VARIANTS를 이동 (값 동일).
 * edgeType은 cost getAllEdges 반환값의 edgeType 필드와 일치해야 함.
 */
export const ALLERGEN_CRUST_VARIANTS = [
  { key: '석쇠', label: '석쇠', edgeType: null },
  { key: '치즈크러스트', label: '치즈크러스트', edgeType: '치즈크러스트' },
  { key: '골드스윗', label: '골드스윗', edgeType: '골드스윗크러스트' },
  { key: '씬바사삭', label: '씬바사삭', edgeType: '씬도우' },
];

/** 도우 카테고리 prefix — 기존 allergen/page.jsx L197의 매직 '도우' 중앙화 */
export const DOUGH_CATEGORY_PREFIX = '도우';

/**
 * 식자재 카테고리가 도우 계열인지 판별 (씬바사삭 크러스트 알레르겐 조합용).
 * 로직은 기존과 동일(동작 보존): '도우'로 시작하면 true.
 *
 * @param {string|null|undefined} category
 * @returns {boolean}
 */
export const isDoughCategory = category => (category || '').startsWith(DOUGH_CATEGORY_PREFIX);

/** 메뉴 카테고리가 피자 계열인지 판별 (알레르기 크러스트 변형 행 생성 여부 결정) */
export const isPizzaCategory = category => (category || '').startsWith('피자');
