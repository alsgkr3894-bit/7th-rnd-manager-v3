/**
 * lib/db/module-stores.js — 모듈 → store 그룹 매핑
 *
 * 백업 범위 선택, 모듈별 데이터 통계 등에 사용.
 *
 * 디자인 백업 페이지의 "백업 범위" 5개 모듈에 맞춰 분류:
 *   - sales (메뉴 판매량)
 *   - jette (제때 — price + shipment 통합)
 *   - cost (원가표 / 식자재)
 *   - notes (메뉴개발노트)
 *   - nutrition (영양성분 / 알레르기)
 *   - rnd (R&D 업무 보조)
 *
 * 선택 백업 공통 store(upload_log/migration_flags/menu_master 등)는 항상 포함.
 * settings IndexedDB store는 실제 설정 저장소가 아니라 구버전/전체 백업 호환용 예약 store다.
 */

import { SAMPLE_RECORD_LABEL } from '../sample/constants.js';

/** 모듈 키 → 라벨/설명/store 목록 */
export const MODULE_GROUPS = {
  sales: {
    label: '메뉴 판매량',
    desc: '업로드 원본 + 매칭 결과 + 분류 규칙',
    stores: [
      'sales_files',
      'sales_rows',
      'sales_rules',
      'menu_sales_issues',
      'ref_sales_categories',
      'ref_sales_aliases',
      'ref_excluded',
      'ref_discontinued',
      'ref_event_menus',
    ],
  },
  jette: {
    label: '제때 상품 데이터',
    desc: '가격 이력 + 출고량 + 대상 제품 목록',
    stores: [
      'price_files',
      'price_rows',
      'shipment_files',
      'shipment_rows',
      'ref_shipment_products',
      'ref_shipment_rules',
    ],
  },
  cost: {
    label: '원가표 / 식자재',
    desc: '메뉴 레시피 + 엣지&도우·단가',
    stores: [
      'menu_recipes',
      'cost_ingredients',
      'cost_selling_prices',
      'cost_edge_dough',
      'cost_upload_log',
      'cost_recipe_groups',
      'cost_suppliers',
      'cost_margin_snapshots',
      'cost_ingredient_price_history',
      'cost_platform_fees',
    ],
  },
  notes: {
    label: `메뉴개발노트 / ${SAMPLE_RECORD_LABEL}`,
    desc: '테스트 기록 + 보고용 요약 텍스트 + 샘플 사진 + 시장조사 + 일정 + 작업일지',
    stores: ['menu_dev_notes', 'sample_records', 'market_research', 'note_schedules', 'work_log'],
  },
  nutrition: {
    label: '영양성분 / 알레르기',
    desc: '메뉴별 영양정보 + 알레르기 매칭 표 + 원산지',
    stores: [
      'nutrition_menu_ref',
      'nutrition_raw_values',
      'nutrition_pizza_composition',
      'nutrition_origin_master',
      'nutrition_allergy_master',
      'nutrition_topping_master',
      'nutrition_edge_master',
      'nutrition_set_composition',
    ],
  },
  rnd: {
    label: 'RND 업무',
    desc: '법인카드 내역서 + 사이트 로그인정보 + 법인카드 ISP',
    stores: ['rnd_corporate_card_entries', 'rnd_login_credentials'],
  },
};

/**
 * 구버전/전체 백업 호환용 예약 store.
 * 실제 시스템 설정은 lib/settings.js의 SETTING_LS_KEYS(localStorage)가 source of truth다.
 */
export const LEGACY_RESERVED_STORES = ['settings'];
export const LEGACY_RESERVED_STORE_SET = new Set(LEGACY_RESERVED_STORES);

/** 모듈 무관 공통 store — 선택 백업에 항상 포함 */
export const COMMON_STORES = [
  'upload_log',
  'migration_flags',
  'menu_master',
  'generated_reports',
  'ref_accounts',
];

/** 모듈 키 목록 (UI 순서) */
export const MODULE_KEYS = Object.keys(MODULE_GROUPS);

/**
 * 항상 main DB(`rnd_manager_v3`)에 저장되는 공유 store 이름 집합.
 * 노트 패밀리 + RND 업무(법인카드·로그인정보)는 브랜드가 아닌 회사 단위 데이터라 공유한다.
 */
export const SHARED_STORE_NAMES = new Set([
  ...MODULE_GROUPS.notes.stores,
  ...MODULE_GROUPS.rnd.stores,
]);

/**
 * 선택된 모듈들의 store 합집합 + 공통 store 반환.
 * @param {string[]} scopes - 모듈 키 배열 (['sales', 'cost', ...])
 * @returns {string[]} store 이름 배열 (중복 제거)
 */
export function storesForScopes(scopes) {
  const set = new Set(COMMON_STORES);
  for (const key of scopes) {
    const group = MODULE_GROUPS[key];
    if (!group) continue;
    for (const s of group.stores) set.add(s);
  }
  return Array.from(set);
}
