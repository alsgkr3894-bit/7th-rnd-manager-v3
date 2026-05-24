/**
 * lib/db/schema/index.js — schema 통합 진입점
 *
 * 모듈별 createXxxStores 함수를 순차 호출.
 * onupgradeneeded에서 한 번만 실행.
 *
 * 분할 구조 (feedback_v3_proactive_maintenance 원칙):
 *   - common.js:    settings, upload_log, migration_flags
 *   - sales.js:     sales_*, ref_sales_*, ref_excluded, ref_discontinued, ref_event_menus, menu_sales_issues
 *   - price.js:     price_*
 *   - shipment.js:  shipment_*, ref_shipment_*
 *   - cost.js:      cost_*
 *   - note.js:      menu_dev_notes
 *   - nutrition.js: nutrition_* (15개)
 */

import { createCommonStores }    from './common';
import { createSalesStores }     from './sales';
import { createPriceStores }     from './price';
import { createShipmentStores }  from './shipment';
import { createCostStores }      from './cost';
import { createNoteStores }      from './note';
import { createNutritionStores } from './nutrition';

/**
 * @param {IDBDatabase} idb
 * @param {number} oldVersion - 이전 DB 버전 (0 = 신규)
 */
export function createStores(idb, oldVersion = 0) {
  createCommonStores(idb);
  createSalesStores(idb);
  createPriceStores(idb);
  createShipmentStores(idb);
  createCostStores(idb);
  createNoteStores(idb);
  createNutritionStores(idb);
}
