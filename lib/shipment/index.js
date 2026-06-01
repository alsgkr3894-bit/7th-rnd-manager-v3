/**
 * lib/shipment — 제때 제품 출고량 모듈 진입점
 */

export { INITIAL_MANAGED_PRODUCTS, PRODUCT_CODE_PATCHES } from './products.js';
export { parseShipmentRows, filterTargetRows } from './parse.js';
export { aggregateShipmentRows } from './aggregate.js';

export {
  getShipmentFiles, getShipmentRowsByFileId,
  checkHashExists,
  saveShipmentUpload, deleteShipmentFile,
} from './store-files.js';

export {
  seedManagedProductsIfEmpty,
  getManagedProducts, getAllManagedProducts,
  addManagedProduct, deleteManagedProduct, updateManagedProduct,
} from './store-managed.js';

export { migrateExclusiveFromPriceList } from './store-migration.js';

export { onManagedProductsChange, emitManagedProductsChange } from './products-events.js';
