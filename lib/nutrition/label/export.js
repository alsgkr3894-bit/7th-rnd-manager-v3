/**
 * lib/nutrition/label/export.js — 영양성분표 엑셀 출력
 *
 * 2026-09-22 주임님 양식(통합 문서3.xlsx)대로 시트 1개(영양성분_알레르기)에 세로로 쌓는다:
 * 제목 → Pizza(조각 기준 기본, L/R 쌍 열, 메뉴명 세로 병합, 1인용은 "씬바샤삭(1인용)" 1행)
 * → 추가 토핑 → Side → Pasta → Beverage(같은 음료의 용량들은 메뉴명 병합) → Set Box
 * → 하프앤하프 → 원산지 표기문 → 주석 4줄 → "YYYY년 M월 기준". 표 칸 전부 테두리.
 * 양식처럼 A열은 비우고 B열부터 쓴다.
 */
import { loadXlsxStyled } from '@/lib/excel';
import { CELL_BORDER, applyTableStyle, applyTitleStyle, setRowHeight } from '@/lib/excel-style';
import { makeFileNameWithBrand } from '@/lib/download';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { PERSONAL_PIZZA_CRUST_LABEL, THIN_CRUST_LABEL } from '@/lib/nutrition/crust-config';
import { buildOriginStatementLines } from '@/lib/nutrition/origin/output-sheets';
import { stripPizzaWord } from '@/lib/nutrition/origin/store-display-format';
import {
  buildPosterPizzaRows,
  displayNutritionMenuName,
  formatNutritionPosterMonth,
  pairAllergen,
  splitSetHalfRows,
  splitSideAndPastaRows,
} from './poster';

export const NUTRITION_LABEL_SHEET_NAME = '영양성분_알레르기';
export const NUTRITION_LABEL_TITLE = '제품영양성분 / 알레르기 유발 성분';
export const NUTRITION_LABEL_NOTES = [
  '1.위 제품은 재료의 수급 상황에 따라 구성 성분이 다소 차이가 날 수 있습니다.',
  '2.위 영양 성분 표는 제품의 중량으로, 실제 제공 시와 차이가 날 수 있습니다.',
  '3.위 영양 성분 수치는 설정 방법에 따라 차이가 날 수 있습니다.',
  '4.위 원산지 내용은 현지 사정에 따라 다소 변경될 수 있습니다.',
];
const ALLERGEN_HEADER = '함유된 알레르기 유발물질';
const PERSONAL_CRUST_EXCEL_LABEL = `${THIN_CRUST_LABEL}(1인용)`;
// 양식처럼 A열을 비운다
const LEFT_PAD = 1;
const BLANK_ROWS_BETWEEN = 2;

// weight 열은 한판 총중량이 아니라 환산 기준량(150g)이라 "기준중량"으로 표기한다.
export const PIZZA_150_GROUPS = [
  { label: '기준중량(g)', key: 'weight' },
  { label: '열량 (kcal/150g)', key: 'kcal' },
  { label: '당류 (g/150g)', key: 'sugar' },
  { label: '단백질 (g/150g)', key: 'protein' },
  { label: '포화지방 (g/150g)', key: 'fat' },
  { label: '나트륨 (mg/150g)', key: 'sodium' },
];

export const PIZZA_SLICE_GROUPS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '1회 조각수', key: 'servingLabel' },
  { label: '총 조각 중량 (g)', key: 'totalWeight' },
  { label: '열량 (kcal/1회분)', key: 'kcal' },
  { label: '당류 (g/1회분)', key: 'sugar' },
  { label: '단백질 (g/1회분)', key: 'protein' },
  { label: '포화지방 (g/1회분)', key: 'fat' },
  { label: '나트륨 (mg/1회분)', key: 'sodium' },
];

const SIMPLE_COLS = [
  { label: '1회 중량 (g)', key: 'weight' },
  { label: '열량 (kcal/1회분)', key: 'kcal' },
  { label: '당류 (g/1회분)', key: 'sugar' },
  { label: '단백질 (g/1회분)', key: 'protein' },
  { label: '포화지방 (g/1회분)', key: 'fat' },
  { label: '나트륨 (mg/1회분)', key: 'sodium' },
];
const SIDE_COLS = [{ label: '총 중량 (g)', key: 'weight' }, ...SIMPLE_COLS.slice(1)];
const BEVERAGE_COLS = [{ label: '총 용량 (ml)', key: 'weight' }, ...SIMPLE_COLS.slice(1)];

const cell = value => {
  if (value == null) return '';
  const text = String(value);
  return text === '—' ? '' : value;
};

function pizzaPairValue(row, key, side) {
  return cell(row?.sides?.[side]?.[key]);
}

function excelCrustLabel(crustLabel) {
  const text = asDisplayText(crustLabel);
  return text === PERSONAL_PIZZA_CRUST_LABEL ? PERSONAL_CRUST_EXCEL_LABEL : text;
}

// 음료는 코드의 마지막 "-용량" 세그먼트(D-CC-001-355)를 떼면 같은 음료끼리 묶인다.
function beverageGroupKey(row) {
  const code = asDisplayText(row?.menuCode);
  const base = code.replace(/-\d+$/, '');
  if (base && base !== code) return `code:${base}`;
  return `name:${beverageDisplayName(row)}`;
}

export function beverageDisplayName(row) {
  const name = displayNutritionMenuName(row?.menuName);
  return (
    name
      .replace(/\s*\d+(?:\.\d+)?\s*(?:ml|mL|ML|l|L|리터)\s*$/u, '')
      .replace(/[\s(（]+$/u, '')
      .trim() || name
  );
}

function pushBlankRows(rows, count = BLANK_ROWS_BETWEEN) {
  for (let i = 0; i < count; i++) rows.push([]);
}

function padded(values) {
  return [...Array(LEFT_PAD).fill(''), ...values];
}

/**
 * 시트 하나에 들어갈 행 배열·병합·스타일 범위를 만든다(순수 함수 — 테스트용).
 * @returns {{ rows: any[][], merges: object[], tables: object[], titles: object[], colCount: number }}
 */
export function buildNutritionLabelWorkbook({
  basis = 'slice',
  pizzaSheet = [],
  pizzaSliceSheet = [],
  toppingSheet = [],
  sideSheet = [],
  setHalfSheet = [],
  beverageSheet = [],
  originStatementSheet = [],
} = {}) {
  const rows = [];
  const merges = [];
  const tables = [];
  const titles = [];
  const groups = basis === '150g' ? PIZZA_150_GROUPS : PIZZA_SLICE_GROUPS;
  const pizzaColCount = 2 + groups.length * 2 + 1;
  const colCount = LEFT_PAD + pizzaColCount;
  const c0 = LEFT_PAD;

  const mergeH = (r, cStart, cEnd) => merges.push({ s: { r, c: cStart }, e: { r, c: cEnd } });
  const mergeV = (rStart, rEnd, c) => merges.push({ s: { r: rStart, c }, e: { r: rEnd, c } });

  // ── 제목 ──
  rows.push([]);
  const titleRow = rows.length;
  rows.push(padded([NUTRITION_LABEL_TITLE]));
  mergeH(titleRow, c0, colCount - 1);
  titles.push({ r: titleRow, c: c0, size: 14 });
  pushBlankRows(rows, 1);

  // ── Pizza (L/R 쌍) ──
  {
    const headerRow = rows.length;
    rows.push(padded(['Pizza', '', ...groups.flatMap(g => [g.label, '']), ALLERGEN_HEADER]));
    rows.push(padded(['', '', ...groups.flatMap(() => ['L', 'R']), '']));
    mergeH(headerRow, c0, c0 + 1);
    mergeH(headerRow + 1, c0, c0 + 1);
    groups.forEach((_, i) => mergeH(headerRow, c0 + 2 + i * 2, c0 + 3 + i * 2));
    mergeV(headerRow, headerRow + 1, c0 + pizzaColCount - 1);

    const pizzaRows =
      basis === '150g'
        ? buildPosterPizzaRows([], pizzaSheet).map(row => ({ ...row, sides: row.per150Sides }))
        : buildPosterPizzaRows(pizzaSliceSheet, []);
    let spanStart = null;
    pizzaRows.forEach((row, index) => {
      const r = rows.length;
      const isPersonal = asDisplayText(row.crustLabel) === PERSONAL_PIZZA_CRUST_LABEL;
      rows.push(
        padded([
          row.firstOfMenu ? pizzaRowName(row, isPersonal) : '',
          excelCrustLabel(row.crustLabel),
          ...groups.flatMap(g => [
            pizzaPairValue(row, g.key, 'L'),
            pizzaPairValue(row, g.key, 'R'),
          ]),
          cell(pairAllergen(row)),
        ])
      );
      if (row.firstOfMenu) spanStart = r;
      const last = index === pizzaRows.length - 1 || pizzaRows[index + 1].firstOfMenu;
      if (last && spanStart != null && r > spanStart) mergeV(spanStart, r, c0);
    });
    tables.push({
      r0: headerRow,
      r1: rows.length - 1,
      c0,
      c1: c0 + pizzaColCount - 1,
      headerRows: 2,
    });
  }
  pushBlankRows(rows);

  // ── 단순 표(추가 토핑 / Side / Pasta / Beverage) ──
  const simpleTable = (title, sheet, cols, { allergen = true, groupBy = null } = {}) => {
    const headerRow = rows.length;
    const width = 1 + cols.length + (allergen ? 1 : 0);
    rows.push(
      padded([title, ...cols.map(col => col.label), ...(allergen ? [ALLERGEN_HEADER] : [])])
    );
    const list = asObjectArray(sheet);
    let groupStart = null;
    let prevKey = null;
    list.forEach((row, index) => {
      const r = rows.length;
      const key = groupBy ? groupBy(row) : null;
      const sameGroup = groupBy && key === prevKey;
      const name = groupBy ? beverageDisplayName(row) : displayNutritionMenuName(row?.menuName);
      rows.push(
        padded([
          sameGroup ? '' : name,
          ...cols.map(col => cell(row?.[col.key])),
          ...(allergen ? [cell(row?.allergen)] : []),
        ])
      );
      if (groupBy) {
        if (!sameGroup) groupStart = r;
        const nextKey = index + 1 < list.length ? groupBy(list[index + 1]) : null;
        if (nextKey !== key && groupStart != null && r > groupStart) mergeV(groupStart, r, c0);
        prevKey = key;
      }
    });
    tables.push({ r0: headerRow, r1: rows.length - 1, c0, c1: c0 + width - 1, headerRows: 1 });
    pushBlankRows(rows);
  };

  const { sideRows, pastaRows } = splitSideAndPastaRows(sideSheet);
  simpleTable('추가 토핑', toppingSheet, SIMPLE_COLS);
  simpleTable('Side', sideRows, SIDE_COLS);
  simpleTable('Pasta', pastaRows, SIDE_COLS);
  simpleTable('Beverage', sortBeverages(beverageSheet), BEVERAGE_COLS, {
    allergen: false,
    groupBy: beverageGroupKey,
  });

  // ── Set Box / 하프앤하프 ──
  const { setRows, halfRows } = splitSetHalfRows(setHalfSheet);
  const setTable = (title, list) => {
    const headerRow = rows.length;
    rows.push(padded([title, '최소 열량 (kcal)', '최대 열량 (kcal)', '1회 중량 (g)']));
    asObjectArray(list).forEach(row => {
      rows.push(
        padded([setRowName(row), cell(row?.minKcal), cell(row?.maxKcal), cell(row?.weight)])
      );
    });
    tables.push({ r0: headerRow, r1: rows.length - 1, c0, c1: c0 + 3, headerRows: 1 });
    pushBlankRows(rows);
  };
  setTable('Set Box', setRows);
  setTable('하프앤하프', halfRows);

  // ── 원산지 표기문(셀 하나) ──
  {
    const headerRow = rows.length;
    rows.push(padded(['원산지']));
    mergeH(headerRow, c0, c0 + 3);
    const bodyRow = rows.length;
    const text = buildOriginStatementLines(originStatementSheet).join('\n');
    rows.push(padded([text]));
    mergeH(bodyRow, c0, c0 + 3);
    tables.push({
      r0: headerRow,
      r1: bodyRow,
      c0,
      c1: c0 + 3,
      headerRows: 1,
      align: 'left',
      bodyHeight: Math.max(120, 18 * (text.split('\n').length + 4)),
    });
    pushBlankRows(rows);
  }

  // ── 주석 · 기준월 ──
  NUTRITION_LABEL_NOTES.forEach(note => rows.push(padded([note])));
  pushBlankRows(rows);
  rows.push(padded([formatNutritionPosterMonth()]));

  return { rows, merges, tables, titles, colCount };
}

// "패밀리박스 L세트" / "하프앤하프 L" → 양식의 "패밀리박스 (L)" / "하프앤하프 (L)"
function setRowName(row) {
  const raw = asDisplayText(row?.menuName);
  const side = asDisplayText(row?.side).toUpperCase();
  if (!side) return raw;
  const base = raw
    .replace(new RegExp(`\\s*${side}\\s*세트\\s*$`, 'u'), '')
    .replace(new RegExp(`\\s*${side}\\s*$`, 'u'), '')
    .trim();
  return `${base || raw} (${side})`;
}

// Pizza 표의 메뉴명: 양식처럼 "피자" 단어를 빼고, 1인용 행은 "(1인)" 표식도 뺀다(크러스트 열에
// "씬바샤삭(1인용)"으로 적히므로).
function pizzaRowName(row, isPersonal) {
  const name = stripPizzaWord(row?.menuName);
  return isPersonal ? name.replace(/\s*[(（]\s*1인(?:용)?\s*[)）]\s*$/u, '').trim() || name : name;
}

function sortBeverages(sheet) {
  const list = asObjectArray(sheet);
  // 같은 음료끼리 붙이고(첫 등장 순), 용량 내림차순(1250 → 500 → 355)
  const order = new Map();
  list.forEach(row => {
    const key = beverageGroupKey(row);
    if (!order.has(key)) order.set(key, order.size);
  });
  return [...list].sort(
    (a, b) =>
      order.get(beverageGroupKey(a)) - order.get(beverageGroupKey(b)) ||
      (Number(b?.weight) || 0) - (Number(a?.weight) || 0)
  );
}

export async function exportNutritionLabelToExcel(input = {}) {
  const XLSX = await loadXlsxStyled();
  const wb = XLSX.utils.book_new();
  const { rows, merges, tables, titles, colCount } = buildNutritionLabelWorkbook(input);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // 첫 행·A열이 비어 있어도 시트 범위를 A1부터 잡아 셀 좌표가 행 배열 인덱스와 같게 한다
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length - 1, c: colCount - 1 },
  });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 4 },
    { wch: 30 },
    { wch: 22 },
    ...Array.from({ length: Math.max(0, colCount - 4) }, () => ({ wch: 12 })),
    { wch: 60 },
  ];
  titles.forEach(t => {
    applyTitleStyle(XLSX, ws, t);
    setRowHeight(ws, t.r, 30);
  });
  tables.forEach(table => {
    applyTableStyle(XLSX, ws, table);
    if (table.bodyHeight) {
      setRowHeight(ws, table.r1, table.bodyHeight);
      const addr = XLSX.utils.encode_cell({ r: table.r1, c: table.c0 });
      ws[addr].s = {
        border: CELL_BORDER,
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, NUTRITION_LABEL_SHEET_NAME);
  XLSX.writeFile(wb, makeFileNameWithBrand('제품 영양성분표', 'xlsx'));
}
