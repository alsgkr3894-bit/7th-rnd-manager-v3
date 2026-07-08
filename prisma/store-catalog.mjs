import { COMPANIES } from '../lib/companies.js';
import { ALL_STORES, DB_NAME } from '../lib/db/constants.js';
import { MODULE_GROUPS, SHARED_STORE_NAMES } from '../lib/db/module-stores.js';

function index(name, keyPath, options = {}) {
  const definition = { name, keyPath };
  if (options.unique) definition.unique = true;
  return definition;
}

const STORE_MODULE_OVERRIDES = {
  settings: 'common',
  upload_log: 'common',
  migration_flags: 'common',
  menu_master: 'common',
  generated_reports: 'report',
  ref_accounts: 'account',
};

const MODULE_BY_STORE = new Map(
  Object.entries(MODULE_GROUPS).flatMap(([module, group]) =>
    group.stores.map(storeName => [storeName, module])
  )
);

const STORE_OPTIONS = {
  settings: { keyPath: 'key' },
  upload_log: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('fileHash', 'fileHash'),
      index('module', 'module'),
      index('module_fileHash', ['module', 'fileHash']),
      index('linkedFileId', 'linkedFileId'),
    ],
  },
  migration_flags: { keyPath: 'flag' },
  menu_master: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('menuCode', 'menuCode', { unique: true }),
      index('category', 'category'),
      index('status', 'status'),
      index('displayOrder', 'displayOrder'),
    ],
  },
  menu_recipes: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('menuCode', 'menuCode', { unique: true }),
      index('displayGroupKey', 'displayGroupKey'),
      index('category', 'category'),
      index('kind', 'kind'),
      index('updatedAt', 'updatedAt'),
    ],
  },
  sales_files: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('year_month', ['year', 'month'])],
  },
  sales_rows: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('fileId', 'fileId'),
      index('category', 'category'),
      index('normalizedMenuName', 'normalizedMenuName'),
      index('year_month', ['year', 'month']),
      index('category_normalizedMenuName', ['category', 'normalizedMenuName']),
      index('status', 'status'),
    ],
  },
  sales_rules: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('rawMenuName', 'rawMenuName'), index('enable', 'enable')],
  },
  menu_sales_issues: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('fileId', 'fileId'),
      index('issueType', 'issueType'),
      index('status', 'status'),
      index('year_month', ['year', 'month']),
    ],
  },
  ref_sales_categories: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('categoryName', 'categoryName', { unique: true }),
      index('displayOrder', 'displayOrder'),
      index('enabled', 'enabled'),
    ],
  },
  ref_sales_aliases: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('rawName', 'rawName'), index('enable', 'enable')],
  },
  ref_excluded: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('menuName', 'menuName')],
  },
  ref_discontinued: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('menuName', 'menuName')],
  },
  ref_event_menus: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('menuName', 'menuName')],
  },
  price_files: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('updateDate', 'updateDate', { unique: true })],
  },
  price_rows: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('fileId', 'fileId'),
      index('updateDate', 'updateDate'),
      index('productCode', 'productCode'),
      index('fileId_productCode', ['fileId', 'productCode']),
    ],
  },
  shipment_files: { keyPath: 'id', autoIncrement: true },
  shipment_rows: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('fileId', 'fileId'),
      index('productCode', 'productCode'),
      index('year_month', ['year', 'month']),
    ],
  },
  ref_shipment_products: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('productCode', 'productCode', { unique: true }), index('enable', 'enable')],
  },
  ref_shipment_rules: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('rawName', 'rawName'),
      index('mappedCode', 'mappedCode'),
      index('enable', 'enable'),
    ],
  },
  cost_ingredients: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('productCode', 'productCode'), index('ingredientName', 'ingredientName')],
  },
  cost_selling_prices: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('menuCode', 'menuCode'), index('menuName', 'menuName'), index('size', 'size')],
  },
  cost_edge_dough: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('edgeType', 'edgeType'), index('size', 'size')],
  },
  cost_upload_log: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('uploadType', 'uploadType'), index('uploadedAt', 'uploadedAt')],
  },
  cost_recipe_groups: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('name', 'name')],
  },
  cost_suppliers: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('name', 'name')],
  },
  cost_margin_snapshots: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('capturedAt', 'capturedAt')],
  },
  cost_ingredient_price_history: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('ingredientId', 'ingredientId'), index('changedAt', 'changedAt')],
  },
  cost_platform_fees: { keyPath: 'id' },
  menu_dev_notes: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('status', 'status'),
      index('category', 'category'),
      index('createdAt', 'createdAt'),
      index('parentId', 'parentId'),
      index('brand', 'brand'),
    ],
  },
  sample_records: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('category', 'category'),
      index('menuName', 'menuName'),
      index('testDate', 'testDate'),
      index('createdAt', 'createdAt'),
    ],
  },
  market_research: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('date', 'date'),
      index('type', 'type'),
      index('brand', 'brand'),
      index('createdAt', 'createdAt'),
    ],
  },
  note_schedules: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('date', 'date'), index('type', 'type'), index('createdAt', 'createdAt')],
  },
  work_log: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('date', 'date'), index('type', 'type'), index('at', 'at')],
  },
  nutrition_menu_ref: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('menuCode', 'menuCode'),
      index('category', 'category'),
      index('displayOrder', 'displayOrder'),
    ],
  },
  nutrition_raw_values: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('menuCode', 'menuCode'),
      index('crustType', 'crustType'),
      index('menu_crust', ['menuCode', 'crustType']),
    ],
  },
  nutrition_pizza_composition: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('menuCode', 'menuCode'), index('baseMenuCode', 'baseMenuCode')],
  },
  nutrition_origin_master: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('ingredientName', 'ingredientName'),
      index('category', 'category'),
      index('displayOrder', 'displayOrder'),
    ],
  },
  nutrition_allergy_master: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('allergenCode', 'allergenCode'), index('displayOrder', 'displayOrder')],
  },
  nutrition_topping_master: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('toppingCode', 'toppingCode'), index('displayOrder', 'displayOrder')],
  },
  nutrition_edge_master: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('edgeCode', 'edgeCode'), index('displayOrder', 'displayOrder')],
  },
  nutrition_set_composition: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('setCode', 'setCode'), index('kind', 'kind')],
  },
  generated_reports: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('kind', 'kind'), index('createdAt', 'createdAt'), index('fav', 'fav')],
  },
  ref_accounts: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('role', 'role')],
  },
  rnd_corporate_card_entries: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [index('usedAt', 'usedAt'), index('vendor', 'vendor'), index('category', 'category')],
  },
  rnd_login_credentials: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      index('siteName', 'siteName'),
      index('category', 'category'),
      index('isIsp', 'isIsp'),
    ],
  },
};

function moduleForStore(storeName) {
  return STORE_MODULE_OVERRIDES[storeName] ?? MODULE_BY_STORE.get(storeName) ?? 'common';
}

function validateCatalogSource() {
  const storeSet = new Set(ALL_STORES);
  const duplicateStores = ALL_STORES.filter((storeName, indexInList) => {
    return ALL_STORES.indexOf(storeName) !== indexInList;
  });
  const missing = ALL_STORES.filter(storeName => !STORE_OPTIONS[storeName]);
  const extra = Object.keys(STORE_OPTIONS).filter(storeName => !storeSet.has(storeName));

  if (duplicateStores.length || missing.length || extra.length) {
    throw new Error(
      [
        duplicateStores.length ? `duplicate stores: ${duplicateStores.join(', ')}` : null,
        missing.length ? `missing store metadata: ${missing.join(', ')}` : null,
        extra.length ? `extra store metadata: ${extra.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('; ')
    );
  }
}

validateCatalogSource();

export const DEFAULT_BRAND_SEED = COMPANIES.map(company => ({
  id: company.id,
  name: company.name,
  code: company.id,
  dbName: company.id === 'main' ? DB_NAME : `${DB_NAME}__${company.id}`,
  color: company.color,
  isDefault: company.id === 'main',
  hidden: false,
  metadata: {
    sub: company.sub,
    logo: company.logo,
  },
}));

export const STORE_CATALOG_SEED = ALL_STORES.map(storeName => {
  const options = STORE_OPTIONS[storeName];
  return {
    name: storeName,
    module: moduleForStore(storeName),
    scope: SHARED_STORE_NAMES.has(storeName) ? 'SHARED' : 'BRAND',
    keyPath: options.keyPath ?? null,
    autoIncrement: Boolean(options.autoIncrement),
    description: null,
    indexes: options.indexes ?? [],
  };
});
