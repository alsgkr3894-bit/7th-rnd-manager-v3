/**
 * 영양성분 엑셀 가져오기 수동 매칭 학습값.
 * { [normalizedExcelName]: { menuCode, menuName, category } }
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { normalizeImportMatchKey } from '@/lib/nutrition/values/import';

export const NUTRITION_IMPORT_ALIAS_KEY = 'v3:nutrition-import-aliases';

function cleanAliasMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value)
    .map(([key, alias]) => {
      const matchKey = normalizeImportMatchKey(key);
      const menuCode = String(alias?.menuCode || '').trim();
      if (!matchKey || !menuCode) return null;
      return [
        matchKey,
        {
          menuCode,
          menuName: String(alias?.menuName || '').trim(),
          category: String(alias?.category || '').trim(),
        },
      ];
    })
    .filter(Boolean);
  return Object.fromEntries(entries);
}

export function loadNutritionImportAliases() {
  return cleanAliasMap(getJSONLS(NUTRITION_IMPORT_ALIAS_KEY));
}

export function saveNutritionImportAliases(map) {
  setJSONLS(NUTRITION_IMPORT_ALIAS_KEY, cleanAliasMap(map));
}

export function upsertNutritionImportAlias(rawName, alias) {
  const matchKey = normalizeImportMatchKey(rawName);
  const menuCode = String(alias?.menuCode || '').trim();
  if (!matchKey || !menuCode) return loadNutritionImportAliases();

  const next = {
    ...loadNutritionImportAliases(),
    [matchKey]: {
      menuCode,
      menuName: String(alias?.menuName || '').trim(),
      category: String(alias?.category || '').trim(),
    },
  };
  saveNutritionImportAliases(next);
  return next;
}

export function rememberNutritionImportAliases(rows = []) {
  let next = loadNutritionImportAliases();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.menuCode || !row?.rawName) continue;
    const alias = {
      menuCode: row.menuCode,
      menuName: row.menuName,
      category: row.category,
    };
    // baseName은 "석쇠 L" 같은 크러스트 표기가 빠진 이름이라 1인용 표식이 없다.
    // row.personal일 때 표식 없이 그대로 저장하면 일반 피자와 같은 매칭 키를 갖게 돼
    // 이후 가져오기에서 서로 다른 제품이 이 alias로 잘못 합쳐진다.
    const baseNameForKey =
      row.baseName && row.personal ? `${row.baseName} (1인용)` : row.baseName;
    next = {
      ...next,
      [normalizeImportMatchKey(row.rawName)]: alias,
      ...(baseNameForKey ? { [normalizeImportMatchKey(baseNameForKey)]: alias } : {}),
    };
  }
  saveNutritionImportAliases(next);
  return next;
}
