/**
 * lib/db/constants.js — DB 식별자 + store 목록
 *
 * v2 src/core/constants.js에서 DB 관련 부분만 분리.
 * v3는 v2와 다른 DB 이름을 사용 (도메인 분리 + 데이터 충돌 방지).
 * v2 데이터는 백업/복원 기능으로 마이그레이션.
 */

export const DB_NAME = 'rnd_manager_v3';
export const DB_VERSION = 1;

/**
 * 사용 중인 store 목록. 페이지 추가 시 schema.js + 이 목록 모두 갱신.
 * 점진적 추가 — 모든 store를 처음부터 만들지 않음.
 */
export const ALL_STORES = [
  // 공통
  'settings',
  'upload_log',
  // sales (1차 이식 대상)
  'sales_files',
  'sales_rows',
  'sales_rules',
  'menu_sales_issues',
  'ref_sales_categories',
  'ref_sales_aliases',
  'ref_excluded',
  'ref_discontinued',
  'ref_event_menus',
  // price (2차 이식 예정)
  // 'price_files',
  // 'price_rows',
  // shipment, cost, nutrition 등은 페이지 작업 시 추가
];
