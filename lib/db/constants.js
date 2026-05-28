/**
 * lib/db/constants.js — DB 식별자 + 전체 store 목록
 *
 * v3는 처음부터 v2와 호환되는 schema 보유 (v2 백업 100% 복원 가능).
 * 페이지 이식은 점진이지만 store 자체는 한 번에 생성.
 *
 * DB_VERSION 2로 올림 — 초기 1버전에서 sales+공통만 만들었던 사용자도
 * 자동으로 나머지 store 추가 생성됨 (onupgradeneeded).
 */

export const DB_NAME = 'rnd_manager_v3';
export const DB_VERSION = 7;

/** store 목록 — 백업/복원 호환성 보장 */
export const ALL_STORES = [
  // 공통
  'settings',
  'upload_log',
  'migration_flags',

  // 메뉴 마스터 (전 모듈 공용 menuCode 기준)
  'menu_master',

  // sales (메뉴판매량)
  'sales_files',
  'sales_rows',
  'sales_rules',
  'menu_sales_issues',
  'ref_sales_categories',
  'ref_sales_aliases',
  'ref_excluded',
  'ref_discontinued',
  'ref_event_menus',

  // price (제때 상품 가격)
  'price_files',
  'price_rows',

  // shipment (제때 출고량)
  'shipment_files',
  'shipment_rows',
  'ref_shipment_products',
  'ref_shipment_rules',

  // cost (원가계산)
  'cost_recipes',
  'cost_ingredients',
  'cost_selling_prices',
  'cost_edge_dough',
  'cost_pizza_detail',
  'cost_personal_detail',
  'cost_side_detail',
  'cost_set_detail',
  'cost_upload_log',

  // note (메뉴개발노트 + 샘플기록)
  'menu_dev_notes',
  'sample_records',

  // nutrition (영양성분) — 8개
  'nutrition_menu_ref',
  'nutrition_raw_values',
  'nutrition_allergy_links',
  'nutrition_pizza_composition',
  'nutrition_origin_master',
  'nutrition_allergy_master',
  'nutrition_topping_master',
  'nutrition_edge_master',

  // report (보고서센터)
  'generated_reports',
];
