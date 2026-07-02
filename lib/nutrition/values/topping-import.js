/**
 * 추가토핑 영양성분 엑셀 가져오기 순수 로직.
 */
import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { NUTRITION_FIELDS } from './calc';

const FIELD_ALIASES = {
  weight: ['중량', '총중량', '총 중량', '1회분', '1회 제공량', '1회분량', 'weight'],
  kcal: ['열량', '칼로리', 'kcal'],
  carbs: ['탄수화물', 'carbs'],
  sugar: ['당류', 'sugar'],
  fat: ['조지방', '총지방', '지방', 'fat'],
  satFat: ['포화지방', '포화 지방'],
  transFat: ['트랜스지방', '트랜스 지방'],
  cholesterol: ['콜레스테롤'],
  protein: ['단백질', 'protein'],
  sodium: ['나트륨', 'sodium'],
};

function asText(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function headerKey(value) {
  return asText(value).replace(/\s+/g, '').toLowerCase();
}

function textKey(value) {
  return asText(value).replace(/\s+/g, '').toLowerCase();
}

function parseNum(value) {
  if (value === '' || value == null) return '';
  const text = String(value)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '');
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? num : '';
}

function colIdx(headers, aliases = []) {
  const normalized = headers.map(headerKey);
  for (const alias of aliases) {
    const key = headerKey(alias);
    const exact = normalized.findIndex(header => header === key);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const key = headerKey(alias);
    const partial = normalized.findIndex(header => header.includes(key));
    if (partial >= 0) return partial;
  }
  return -1;
}

function rowValue(row, index) {
  return index >= 0 ? row[index] : '';
}

function findHeaderIndex(rows) {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const headers = rows[index] || [];
    const nameCol = colIdx(headers, ['추가토핑명', '토핑명', '토핑 이름', '제품명', '상품명']);
    const kcalCol = colIdx(headers, FIELD_ALIASES.kcal);
    if (nameCol >= 0 || kcalCol >= 0) return index;
  }
  return -1;
}

export async function parseToppingExcel(buffer) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const rows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
    });
    const headerIndex = findHeaderIndex(sheetRows);
    if (headerIndex < 0) continue;

    const headers = sheetRows[headerIndex] || [];
    const columns = {
      toppingCode: colIdx(headers, [
        '추가토핑코드',
        '토핑코드',
        '토핑 코드',
        '메뉴코드',
        '코드',
        'toppingCode',
        'topping code',
      ]),
      toppingName: colIdx(headers, [
        '추가토핑명',
        '토핑명',
        '토핑 이름',
        '메뉴명',
        '제품명',
        '상품명',
      ]),
      productCode: colIdx(headers, [
        '식자재코드',
        '식자재 코드',
        '재료코드',
        '재료 코드',
        '제품코드',
        '제품 코드',
        '상품코드',
        '원재료코드',
        '원재료 코드',
        'productCode',
        'product code',
        'ingredientCode',
        'ingredient code',
      ]),
      ingredientName: colIdx(headers, [
        '식자재명',
        '식자재 이름',
        '원재료명',
        '재료명',
        'ingredientName',
        'ingredient name',
      ]),
      values: Object.fromEntries(
        NUTRITION_FIELDS.map(field => [field.key, colIdx(headers, FIELD_ALIASES[field.key] || [])])
      ),
    };

    for (let index = headerIndex + 1; index < sheetRows.length; index += 1) {
      const row = sheetRows[index] || [];
      const toppingName = asText(rowValue(row, columns.toppingName));
      const productCode = asText(rowValue(row, columns.productCode));
      const ingredientName = asText(rowValue(row, columns.ingredientName));
      const hasNutrition = Object.values(columns.values).some(col => parseNum(rowValue(row, col)) !== '');
      if (!toppingName && !productCode && !ingredientName && !hasNutrition) continue;
      if (toppingName.startsWith('※') || toppingName === '제품명') continue;

      rows.push({
        sourceSheet: sheetName,
        sourceRow: index + 1,
        toppingCode: asText(rowValue(row, columns.toppingCode)),
        toppingName,
        productCode,
        ingredientName,
        values: Object.fromEntries(
          NUTRITION_FIELDS.map(field => [
            field.key,
            parseNum(rowValue(row, columns.values[field.key])),
          ])
        ),
      });
    }
  }

  if (rows.length === 0) throw new Error('추가토핑 엑셀에서 데이터 행을 찾을 수 없습니다');
  return rows;
}

function buildIngredientLookups(ingredients = []) {
  const byCode = new Map();
  const byName = new Map();
  for (const ingredient of Array.isArray(ingredients) ? ingredients : []) {
    const productCode = asText(ingredient?.productCode);
    const ingredientName = asText(
      ingredient?.ingredientName || ingredient?.displayName || ingredient?.productName
    );
    if (productCode) {
      byCode.set(productCode, { ...ingredient, ingredientName });
      byCode.set(textKey(productCode), { ...ingredient, ingredientName });
    }
    if (ingredientName) byName.set(textKey(ingredientName), { ...ingredient, ingredientName });
  }
  return { byCode, byName };
}

function findIngredient(row, lookups) {
  const byCode = row.productCode
    ? lookups.byCode.get(row.productCode) || lookups.byCode.get(textKey(row.productCode))
    : null;
  if (byCode) return byCode;
  const name = row.ingredientName || row.toppingName;
  return name ? lookups.byName.get(textKey(name)) || null : null;
}

const TOPPING_TEMPLATE_HEADERS = [
  '추가토핑코드',
  '추가토핑명',
  '식자재코드',
  '식자재명',
  '중량(g)',
  '열량(kcal)',
  '탄수화물(g)',
  '당류(g)',
  '조지방(g)',
  '포화지방(g)',
  '트랜스지방(g)',
  '콜레스테롤(mg)',
  '단백질(g)',
  '나트륨(mg)',
  '메모',
];

function originText(origin) {
  if (!Array.isArray(origin)) return '';
  return origin
    .map(item => {
      const name = asText(item?.displayName);
      const country = asText(item?.country);
      if (name && country) return `${name}:${country}`;
      return name || country;
    })
    .filter(Boolean)
    .join(', ');
}

export function buildToppingImportTemplateSheets(ingredients = []) {
  const sampleRows = [
    [
      'TOP-CHEESE',
      '치즈 80g',
      'ING-CHEESE',
      '모짜렐라치즈',
      80,
      246,
      '',
      0,
      '',
      10,
      '',
      '',
      20,
      372,
      '식자재코드는 식자재목록 시트에서 복사해 넣으세요',
    ],
    [
      '',
      '페퍼로니 42g',
      'ING-PEP',
      '페퍼로니',
      42,
      92,
      '',
      1,
      '',
      2,
      '',
      '',
      7,
      261,
      '추가토핑코드가 비어 있으면 저장 시 자동 생성됩니다',
    ],
  ];

  const ingredientRows = (Array.isArray(ingredients) ? ingredients : [])
    .map(ingredient => [
      asText(ingredient?.productCode),
      asText(ingredient?.ingredientName || ingredient?.displayName || ingredient?.productName),
      Array.isArray(ingredient?.allergens) ? ingredient.allergens.map(asText).filter(Boolean).join(', ') : '',
      originText(ingredient?.origin),
    ])
    .filter(row => row[0] || row[1]);

  return {
    toppingRows: [TOPPING_TEMPLATE_HEADERS, ...sampleRows],
    ingredientRows: [['식자재코드', '식자재명', '알레르기코드', '원산지'], ...ingredientRows],
  };
}

export async function downloadToppingImportTemplate(ingredients = []) {
  const XLSX = await loadXlsx();
  const { toppingRows, ingredientRows } = buildToppingImportTemplateSheets(ingredients);
  const wb = XLSX.utils.book_new();
  const toppingSheet = XLSX.utils.aoa_to_sheet(toppingRows);
  toppingSheet['!cols'] = [14, 20, 16, 20, 10, 10, 12, 10, 10, 12, 12, 14, 10, 10, 36].map(wch => ({
    wch,
  }));
  const ingredientSheet = XLSX.utils.aoa_to_sheet(ingredientRows);
  ingredientSheet['!cols'] = [18, 24, 24, 36].map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, toppingSheet, '추가토핑입력');
  XLSX.utils.book_append_sheet(wb, ingredientSheet, '식자재목록');
  XLSX.writeFile(wb, makeFileNameWithBrand('추가토핑_영양성분_가져오기_양식', 'xlsx'));
}

function buildExistingLookups(toppings = []) {
  const byCode = new Map();
  const byName = new Map();
  for (const topping of Array.isArray(toppings) ? toppings : []) {
    const code = asText(topping?.toppingCode);
    const name = asText(topping?.toppingName);
    if (code) byCode.set(code, topping);
    if (name) byName.set(textKey(name), topping);
  }
  return { byCode, byName };
}

export function buildToppingImportRows({ rawRows = [], toppings = [], ingredients = [] } = {}) {
  const existing = buildExistingLookups(toppings);
  const ingredientLookups = buildIngredientLookups(ingredients);
  const seen = new Map();

  return (Array.isArray(rawRows) ? rawRows : []).map((rawRow, index) => {
    const row = rawRow && typeof rawRow === 'object' ? rawRow : {};
    const linkedIngredient = findIngredient(row, ingredientLookups);
    const toppingName =
      asText(row.toppingName) || asText(row.ingredientName) || asText(linkedIngredient?.ingredientName);
    const existingTopping =
      (row.toppingCode && existing.byCode.get(asText(row.toppingCode))) ||
      (toppingName && existing.byName.get(textKey(toppingName))) ||
      null;
    const toppingCode = asText(row.toppingCode || existingTopping?.toppingCode);
    const productCode = asText(linkedIngredient?.productCode || row.productCode);
    const ingredientName = asText(linkedIngredient?.ingredientName || row.ingredientName || toppingName);
    const dupKey = toppingCode || textKey(toppingName);
    const duplicate = dupKey && seen.has(dupKey);
    if (dupKey) seen.set(dupKey, index);
    const values = row.values && typeof row.values === 'object' ? row.values : {};
    const hasNutrition = NUTRITION_FIELDS.some(field => values[field.key] !== '' && values[field.key] != null);
    const status = !toppingName ? 'invalid' : duplicate ? 'dup' : existingTopping ? 'exists' : 'ready';

    return {
      sourceSheet: asText(row.sourceSheet),
      sourceRow: row.sourceRow ?? null,
      toppingCode,
      toppingName,
      productCode,
      ingredientName,
      existingId: existingTopping?.id ?? null,
      status,
      include: status !== 'invalid',
      hasIngredientMatch: !!linkedIngredient,
      hasNutrition,
      values: Object.fromEntries(NUTRITION_FIELDS.map(field => [field.key, values[field.key] ?? ''])),
    };
  });
}

export function toToppingImportRecord(row, index = 0, now = Date.now()) {
  const toppingName = asText(row?.toppingName);
  const fallbackCode = `TOP-${now}-${String(index + 1).padStart(3, '0')}`;
  const toppingCode = asText(row?.toppingCode) || fallbackCode;
  const values = row?.values && typeof row.values === 'object' ? row.values : {};
  return {
    ...(row?.existingId ? { id: row.existingId } : {}),
    toppingCode,
    toppingName,
    productCode: asText(row?.productCode),
    ingredientName: asText(row?.ingredientName || toppingName),
    basis: 'serving',
    ...Object.fromEntries(
      NUTRITION_FIELDS.map(field => [field.key, values[field.key]]).filter(([, value]) => value !== '')
    ),
  };
}
