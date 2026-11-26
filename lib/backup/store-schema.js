/**
 * lib/backup/store-schema.js — 복원 파일의 저장소별 필수 값 검사.
 *
 * 앱이 다른 저장소와 연결할 때 반드시 필요한 값만 본다(2026-11-26 실데이터 303,662행에서
 * 모두 채워져 있는 값). 어긋난 행이 있어도 복원을 막지 않고 미리보기에서 알린다 — 예전
 * 백업을 되살리는 길을 닫지 않기 위해서다.
 */
const text = value => typeof value === 'string' && value.trim() !== '';
const number = value => Number.isFinite(value);
const list = value => Array.isArray(value);

const REQUIRED_FIELDS = {
  menu_master: { menuCode: text, menuName: text },
  menu_recipes: { menuCode: text, components: list },
  cost_selling_prices: { menuCode: text },
  cost_edge_dough: { components: list },
  cost_recipe_groups: { ingredients: list },
  price_files: { updateDate: text },
  price_rows: { fileId: number, productCode: text },
  sales_files: { year: number, month: number },
  sales_rows: { fileId: number },
  shipment_files: { year: number, month: number },
  shipment_rows: { fileId: number },
  nutrition_menu_ref: { menuCode: text },
  nutrition_raw_values: { menuCode: text, crustType: text },
};

// id가 아닌 키를 쓰는 저장소
const KEY_FIELD = { settings: 'key', migration_flags: 'flag' };

const hasKey = (storeName, row) => {
  const field = KEY_FIELD[storeName] || 'id';
  return row[field] !== undefined && row[field] !== null && row[field] !== '';
};

/**
 * @returns {Array<{ store: string, field: string, rows: number }>} 저장소·필드별 어긋난 행 수
 */
export function findStoreSchemaIssues(stores) {
  const issues = [];
  for (const [store, rows] of Object.entries(stores || {})) {
    if (!Array.isArray(rows)) continue;
    const checks = [
      [KEY_FIELD[store] || 'id', row => hasKey(store, row)],
      ...Object.entries(REQUIRED_FIELDS[store] || {}).map(([field, valid]) => [
        field,
        row => valid(row[field]),
      ]),
    ];
    for (const [field, valid] of checks) {
      const bad = rows.reduce((sum, row) => sum + (row && !valid(row) ? 1 : 0), 0);
      if (bad > 0) issues.push({ store, field, rows: bad });
    }
  }
  return issues;
}
