/**
 * lib/db/schema/index.js — schema 통합 진입점
 *
 * 모듈별 createXxxStores 함수를 순차 호출.
 * onupgradeneeded에서 한 번만 실행.
 *
 * 분할 구조:
 *   - common.js:      settings, upload_log, migration_flags
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
import { COST_DETAIL_STORE_INDEXES, createCostStores } from './cost';
import { createNoteStores } from './note';
import { createNutritionStores } from './nutrition';
import { createReportStores } from './report';

function ensureIndexes(store, indexes) {
  for (const [indexName, keyPath, options] of indexes) {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath, options);
    }
  }
}

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

  // v7 마이그레이션: cost_recipes에 menuCode 인덱스 추가
  if (oldVersion > 0 && oldVersion < 7 && upgradeTx) {
    if (idb.objectStoreNames.contains('cost_recipes')) {
      const recipeStore = upgradeTx.objectStore('cost_recipes');
      if (!recipeStore.indexNames.contains('menuCode')) {
        recipeStore.createIndex('menuCode', 'menuCode');
      }
    }
  }

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

  // v18 마이그레이션: detail 레시피 store가 공통 CRUD 기준(menuCode)을 모두 갖도록 정렬.
  if (oldVersion > 0 && oldVersion < 18 && upgradeTx) {
    for (const [storeName, indexes] of Object.entries(COST_DETAIL_STORE_INDEXES)) {
      if (!idb.objectStoreNames.contains(storeName)) continue;
      ensureIndexes(upgradeTx.objectStore(storeName), indexes);
    }
  }

  // v10 마이그레이션: note_schedules 스토어 추가 (createNoteStores에서 자동 처리)

  // v9 마이그레이션:
  //   - cost_selling_prices: menuCode 인덱스 추가 (기존 전수검색 → 인덱스 조회)
  //   - cost_pizza_detail: 잘못된 edgeType 인덱스 제거 + menuCode 인덱스 추가
  if (oldVersion > 0 && oldVersion < 9 && upgradeTx) {
    if (idb.objectStoreNames.contains('cost_selling_prices')) {
      const sp = upgradeTx.objectStore('cost_selling_prices');
      if (!sp.indexNames.contains('menuCode')) {
        sp.createIndex('menuCode', 'menuCode');
      }
    }
    if (idb.objectStoreNames.contains('cost_pizza_detail')) {
      const pd = upgradeTx.objectStore('cost_pizza_detail');
      if (pd.indexNames.contains('edgeType')) {
        pd.deleteIndex('edgeType');
      }
      if (!pd.indexNames.contains('menuCode')) {
        pd.createIndex('menuCode', 'menuCode');
      }
    }
  }
}
