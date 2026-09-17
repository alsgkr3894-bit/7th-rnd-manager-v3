// 원가마진표 엑셀 워크북: 카테고리별 시트 모델, 메타 행, 피자 원가율 요약 시트, XLSX 저장
import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { buildMarginPizzaCostRateSummary } from './report-options';
import { buildMarginExcelRows, buildMarginExcelRowsAllPlatforms } from './export-rows';
import {
  MAX_SHEET_NAME_LENGTH,
  SINGLE_SIZE_LABEL,
  asValidDate,
  categoryLabel,
  discountLabel,
  formatMarginDownloadDate,
  formatRateMetric,
  hasOwnCost,
  isLrCategory,
  isLrSizeLabel,
  isSingleCategory,
  normalizeSizeLabel,
  platformMetaLabel,
  sortSizeLabels,
  viewModeLabel,
} from './export-format';

function worksheetCols(sheetRows) {
  const headers =
    (Array.isArray(sheetRows) ? sheetRows.find(row => row?.[0] === '카테고리') : null) ||
    sheetRows?.[0] ||
    [];
  return headers.map((header, index) => ({
    wch:
      index === 0
        ? 18
        : index === 1
          ? 32
          : index <= 2
            ? 18
            : Math.max(10, Math.min(18, String(header || '').length + 4)),
  }));
}

function safeSheetName(value, usedNames) {
  const base =
    String(value || '기타')
      .replace(/[\[\]*?\/\\:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_SHEET_NAME_LENGTH) || '기타';
  let name = base;
  let index = 2;

  while (usedNames.has(name)) {
    const suffix = ` (${index})`;
    name = `${base.slice(0, MAX_SHEET_NAME_LENGTH - suffix.length)}${suffix}`;
    index += 1;
  }

  usedNames.add(name);
  return name;
}

function appendMarginSheet(XLSX, wb, sheetName, sheetRows, usedNames) {
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws['!cols'] = worksheetCols(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName, usedNames));
}

export function groupRowsByCategory(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const label = categoryLabel(row);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(row);
  }
  return grouped;
}

function collectSizeLabels(rows, predicate = () => true) {
  const labels = new Set();
  for (const row of rows || []) {
    for (const size of row?.sizes || []) {
      const label = normalizeSizeLabel(size?.label);
      if (predicate(label)) labels.add(label);
    }
  }
  return sortSizeLabels(labels);
}

function normalizeSingleSizeRows(row) {
  const sizes = Array.isArray(row?.sizes) ? row.sizes : [];
  if (sizes.length === 0) {
    return [{ ...row, sizes: [], costMap: { ...(row?.costMap || {}), [SINGLE_SIZE_LABEL]: 0 } }];
  }

  const preferred = sizes.filter(size => !isLrSizeLabel(size?.label));
  const picked = preferred.length ? preferred : sizes;
  const multi = picked.length > 1;

  return picked.map((size, index) => {
    const origLabel = normalizeSizeLabel(size?.label);
    return {
      ...row,
      id: multi ? `${row?.id ?? ''}::${origLabel || index}` : row?.id,
      menuName: multi ? `${row?.menuName ?? ''} (${origLabel})` : row?.menuName,
      sizes: [{ ...size, label: SINGLE_SIZE_LABEL }],
      costMap: {
        ...(row?.costMap || {}),
        ...(hasOwnCost(row?.costMap, origLabel)
          ? { [SINGLE_SIZE_LABEL]: row.costMap[origLabel] }
          : {}),
      },
    };
  });
}

export function buildCategorySheetModel(category, rows, fallbackSizeLabels) {
  if (isSingleCategory(category)) {
    return {
      rows: rows.flatMap(normalizeSingleSizeRows),
      sizeLabels: [SINGLE_SIZE_LABEL],
    };
  }
  if (isLrCategory(category)) {
    const sizeLabels = collectSizeLabels(rows, isLrSizeLabel);
    return {
      rows,
      sizeLabels: sizeLabels.length
        ? sizeLabels
        : sortSizeLabels((fallbackSizeLabels || []).filter(isLrSizeLabel)),
    };
  }
  const sizeLabels = collectSizeLabels(rows);
  return {
    rows,
    sizeLabels: sizeLabels.length ? sizeLabels : fallbackSizeLabels,
  };
}

function buildMarginExcelMetaRows({ exportedAt, platformLabel, viewMode, discount }) {
  return [
    ['다운로드일', formatMarginDownloadDate(exportedAt)],
    ['플랫폼', platformLabel],
    ['보기 기준', viewModeLabel(viewMode)],
    ['할인', discountLabel(discount)],
    [],
  ];
}

function withMarginExcelMetaRows(sheetRows, meta) {
  return [...buildMarginExcelMetaRows(meta), ...sheetRows];
}

function buildMarginPizzaCostRateSheetRows(rows, activePlatform, discount) {
  const summary = buildMarginPizzaCostRateSummary(rows, activePlatform, discount);
  if (!summary.total.count) return [];
  return [
    ['피자 원가율 요약'],
    ['전체 피자 평균원가율', formatRateMetric(summary.total), `${summary.total.count}개 가격 기준`],
    [
      'L 사이즈 평균원가율',
      formatRateMetric(summary.sizes.L),
      `${summary.sizes.L.count}개 가격 기준`,
    ],
    [
      'R 사이즈 평균원가율',
      formatRateMetric(summary.sizes.R),
      `${summary.sizes.R.count}개 가격 기준`,
    ],
    [],
    [
      '피자 카테고리',
      '전체 평균원가율',
      'L 사이즈 평균원가율',
      'R 사이즈 평균원가율',
      '기준 가격 수',
    ],
    ...summary.categories.map(row => [
      row.category,
      formatRateMetric(row.total),
      formatRateMetric(row.sizes.L),
      formatRateMetric(row.sizes.R),
      row.total.count,
    ]),
  ];
}

export async function exportMarginExcel(
  rows,
  sizeLabels,
  viewMode,
  activePlatform,
  discount,
  options = {}
) {
  const XLSX = await loadXlsx();
  const exportedAt = asValidDate(options?.now);
  const allPlatforms = Array.isArray(options?.allPlatforms) ? options.allPlatforms : null;
  const meta = {
    exportedAt,
    platformLabel: platformMetaLabel(activePlatform, allPlatforms),
    viewMode,
    discount,
  };
  const buildRows = (categoryRows, categorySizeLabels) =>
    allPlatforms
      ? buildMarginExcelRowsAllPlatforms(
          categoryRows,
          categorySizeLabels,
          viewMode,
          allPlatforms,
          discount
        )
      : buildMarginExcelRows(categoryRows, categorySizeLabels, viewMode, activePlatform, discount);

  const sheetRows = buildRows(rows, sizeLabels);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  appendMarginSheet(XLSX, wb, '원가마진표', withMarginExcelMetaRows(sheetRows, meta), usedNames);

  if (!allPlatforms) {
    const pizzaCostRateSheetRows = buildMarginPizzaCostRateSheetRows(
      rows,
      activePlatform,
      discount
    );
    if (pizzaCostRateSheetRows.length) {
      appendMarginSheet(
        XLSX,
        wb,
        '피자 원가율 요약',
        withMarginExcelMetaRows(pizzaCostRateSheetRows, meta),
        usedNames
      );
    }
  }

  for (const [category, categoryRows] of groupRowsByCategory(rows)) {
    const sheetModel = buildCategorySheetModel(category, categoryRows, sizeLabels);
    appendMarginSheet(
      XLSX,
      wb,
      category,
      withMarginExcelMetaRows(buildRows(sheetModel.rows, sheetModel.sizeLabels), meta),
      usedNames
    );
  }

  XLSX.writeFile(wb, makeFileNameWithBrand('원가마진표', 'xlsx', exportedAt));
}
