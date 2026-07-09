/**
 * lib/db/schema/index.js — schema 통합 진입점
 *
 * 모듈별 createXxxStores 함수를 순차 호출.
 * onupgradeneeded에서 한 번만 실행.
 *
 * 분할 구조:
 *   - common.js:      settings(legacy/reserved), upload_log, migration_flags
 *   - menu-master.js: menu_master (전 모듈 공용)
 *   - sales.js:       sales_*, ref_sales_*, ref_excluded, ref_discontinued, ref_event_menus, menu_sales_issues
 *   - price.js:       price_*
 *   - shipment.js:    shipment_*, ref_shipment_*
 *   - cost.js:        cost_*
 *   - note.js:        menu_dev_notes
 *   - nutrition.js:   nutrition_*
 */

import { createCommonStores } from './common';
import { createMenuMasterStores } from './menu-master';
import { createSalesStores } from './sales';
import { createPriceStores } from './price';
import { createShipmentStores } from './shipment';
import { createCostStores } from './cost';
import { createNoteStores } from './note';
import { createNutritionStores } from './nutrition';
import { createReportStores } from './report';
import { createAccountStores } from './account';
import { createRndStores } from './rnd';

const LEGACY_COST_RECIPE_STORES = [
  'cost_recipes',
  'cost_pizza_detail',
  'cost_personal_detail',
  'cost_side_detail',
  'cost_set_detail',
];

const LEGACY_NUTRITION_INGREDIENT_STORES = ['nutrition_ingredient_values'];

/**
 * @param {IDBDatabase} idb
 * @param {number} oldVersion - 이전 DB 버전 (0 = 신규)
 * @param {IDBTransaction|null} upgradeTx - onupgradeneeded 트랜잭션 (기존 store 인덱스 추가용)
 */
export function createStores(idb, oldVersion = 0, upgradeTx = null) {
  createCommonStores(idb);
  createMenuMasterStores(idb);
  createSalesStores(idb);
  createPriceStores(idb);
  createShipmentStores(idb);
  createCostStores(idb);
  createNoteStores(idb);
  createNutritionStores(idb);
  createReportStores(idb);
  createAccountStores(idb);
  createRndStores(idb);

  // v11 마이그레이션: menu_dev_notes에 parentId 인덱스 추가 (deleteNote 효율화)
  if (oldVersion > 0 && oldVersion < 11 && upgradeTx) {
    if (idb.objectStoreNames.contains('menu_dev_notes')) {
      const noteStore = upgradeTx.objectStore('menu_dev_notes');
      if (!noteStore.indexNames.contains('parentId')) {
        noteStore.createIndex('parentId', 'parentId');
      }
    }
  }

  // v15 마이그레이션: menu_dev_notes에 brand 인덱스 추가 (멀티 브랜드 필터)
  if (oldVersion > 0 && oldVersion < 15 && upgradeTx) {
    if (idb.objectStoreNames.contains('menu_dev_notes')) {
      const noteStore = upgradeTx.objectStore('menu_dev_notes');
      if (!noteStore.indexNames.contains('brand')) {
        noteStore.createIndex('brand', 'brand');
      }
    }
  }

  // v17 마이그레이션: nutrition_allergy_links를 식자재 기준 인덱스로 정렬.
  if (oldVersion > 0 && oldVersion < 17 && upgradeTx) {
    if (idb.objectStoreNames.contains('nutrition_allergy_links')) {
      const allergyLinks = upgradeTx.objectStore('nutrition_allergy_links');
      if (!allergyLinks.indexNames.contains('ingredientId')) {
        allergyLinks.createIndex('ingredientId', 'ingredientId');
      }
      if (!allergyLinks.indexNames.contains('productCode')) {
        allergyLinks.createIndex('productCode', 'productCode');
      }
      if (allergyLinks.indexNames.contains('menuCode')) {
        allergyLinks.deleteIndex('menuCode');
      }
      if (allergyLinks.indexNames.contains('allergenCode')) {
        allergyLinks.deleteIndex('allergenCode');
      }
    }
  }

  // v20 마이그레이션: nutrition_allergy_links 제거 — 알레르기 데이터는 cost_ingredients.allergens으로 이전 완료.
  if (oldVersion > 0 && oldVersion < 20) {
    if (idb.objectStoreNames.contains('nutrition_allergy_links')) {
      idb.deleteObjectStore('nutrition_allergy_links');
    }
  }

  // v26 마이그레이션: rnd_login_credentials의 동작 불가한 boolean 인덱스 isIsp 제거.
  if (oldVersion > 0 && oldVersion < 26 && upgradeTx) {
    if (idb.objectStoreNames.contains('rnd_login_credentials')) {
      const creds = upgradeTx.objectStore('rnd_login_credentials');
      if (creds.indexNames.contains('isIsp')) {
        creds.deleteIndex('isIsp');
      }
    }
  }

  // v25 마이그레이션: rnd_corporate_card_entries/rnd_login_credentials 스토어 추가
  // (createRndStores에서 자동 처리)

  // v24 마이그레이션: market_research 스토어 추가 (createNoteStores에서 자동 처리)

  // v10 마이그레이션: note_schedules 스토어 추가 (createNoteStores에서 자동 처리)

  // v9 마이그레이션:
  //   - cost_selling_prices: menuCode 인덱스 추가 (기존 전수검색 → 인덱스 조회)
  if (oldVersion > 0 && oldVersion < 9 && upgradeTx) {
    if (idb.objectStoreNames.contains('cost_selling_prices')) {
      const sp = upgradeTx.objectStore('cost_selling_prices');
      if (!sp.indexNames.contains('menuCode')) {
        sp.createIndex('menuCode', 'menuCode');
      }
    }
  }

  // v22 마이그레이션: canonical menu_recipes 전환 완료 후 구형 레시피 store 제거.
  // 주의: 이 삭제는 앱 레벨 레시피 변환이 이미 끝났다는 전제다. pre-v22 빌드를 마지막으로
  // 쓰던 기기가 곧바로 최신으로 올라오면 변환 없이 삭제되어 레시피 데이터가 유실될 수 있다.
  // (전용 변환 코드는 저장소에 남아있지 않으므로 여기서 경고만 남긴다.)
  if (oldVersion > 0 && oldVersion < 22) {
    for (const storeName of LEGACY_COST_RECIPE_STORES) {
      if (idb.objectStoreNames.contains(storeName)) {
        console.warn(
          `[DB] v22 업그레이드: 구형 레시피 store '${storeName}' 제거. pre-v22 데이터가 있었다면 menu_recipes로 사전 변환됐는지 확인 필요.`
        );
        idb.deleteObjectStore(storeName);
      }
    }
  }

  // v23 마이그레이션: 식자재 영양값 자동계산 제거 완료 후 참조 store 제거.
  if (oldVersion > 0 && oldVersion < 23) {
    for (const storeName of LEGACY_NUTRITION_INGREDIENT_STORES) {
      if (idb.objectStoreNames.contains(storeName)) {
        console.warn(`[DB] v23 업그레이드: 구형 영양참조 store '${storeName}' 제거.`);
        idb.deleteObjectStore(storeName);
      }
    }
  }
}
