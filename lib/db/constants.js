/**
 * lib/db/constants.js — DB 식별자 + 전체 store 목록
 *
 * 현재 운영 schema의 store 목록을 정의한다.
 * 오래된 백업에만 있는 제거된 store는 복원 시 알 수 없는 store로 건너뛴다.
 *
 * DB_VERSION을 올릴 때는 lib/db/schema/index.js에 기존 DB 보강 마이그레이션을 함께 둔다.
 */

export const DB_NAME = 'rnd_manager_v3';
export const DB_VERSION = 23;

/**
 * 브랜드별 IndexedDB 이름.
 *   main(7번가) → 'rnd_manager_v3' (기존 DB 그대로 = 하위호환·데이터 보존)
 *   그 외       → 'rnd_manager_v3__<brandId>' (완전 분리)
 */
export function dbNameFor(brandId) {
  return !brandId || brandId === 'main' ? DB_NAME : `${DB_NAME}__${brandId}`;
}

/** store 목록 — 백업/복원 호환성 보장 */
export const ALL_STORES = [
  // 공통 / 호환 (settings는 구버전·전체 백업 호환용 예약 store)
  'settings',
  'upload_log',
  'migration_flags',

  // 메뉴 마스터 (전 모듈 공용 menuCode 기준)
  'menu_master',
  'menu_recipes',

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
  'cost_ingredients',
  'cost_selling_prices',
  'cost_edge_dough',
  'cost_upload_log',
  'cost_recipe_groups',
  'cost_suppliers',
  'cost_margin_snapshots',
  'cost_ingredient_price_history',
  'cost_platform_fees',

  // note (메뉴개발노트 + 샘플기록 + 일정 + 작업일지)
  'menu_dev_notes',
  'sample_records',
  'note_schedules',
  'work_log',

  // nutrition (영양성분) — nutrition_allergy_links는 v20, nutrition_ingredient_values는 v23에서 제거
  'nutrition_menu_ref',
  'nutrition_raw_values',
  'nutrition_pizza_composition',
  'nutrition_origin_master',
  'nutrition_allergy_master',
  'nutrition_topping_master',
  'nutrition_edge_master',
  'nutrition_set_composition',

  // report (보고서센터)
  'generated_reports',

  // account (로컬 계정·역할)
  'ref_accounts',
];
