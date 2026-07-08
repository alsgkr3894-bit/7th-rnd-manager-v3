import { getActiveBrand } from '@/lib/active-brand';
import { withDownloadDateSuffix } from '@/lib/download';
import { loadXlsx } from '@/lib/excel';
import { safeQuantity } from '@/lib/report/period';
import { safeSheetName } from '@/lib/sales/export-xlsx';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function scopeLabel(scope) {
  if (scope === 'exclusive') return '전용상품';
  if (scope === 'generic') return '범용상품';
  return '전체';
}

function productName(product) {
  return asDisplayText(product.normalizedProductName) || asDisplayText(product.productName) || '—';
}

function productTypeLabel(product) {
  if (product.productType === 'exclusive') return '전용';
  if (product.isManaged) return '관리품목';
  return '범용';
}

function itemRows(items) {
  return asObjectArray(items).map((item, index) => [
    index + 1,
    productName(item),
    productTypeLabel(item),
    asDisplayText(item.productCode),
    safeQuantity(item.totalQuantity),
    safeQuantity(item.totalAmount),
  ]);
}

function statsRows(title, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return [
    [title, '값'],
    ...safeRows.map(row => [asDisplayText(row?.[0], '—'), safeQuantity(row?.[1])]),
  ];
}

function trendRows(seriesLabels, chartSeries) {
  const safeLabels = Array.isArray(seriesLabels)
    ? seriesLabels.map(label => asDisplayText(label)).filter(Boolean)
    : [];
  const safeSeries = asObjectArray(chartSeries);
  return [
    ['월', ...safeSeries.map(series => asDisplayText(series.name, '—'))],
    ...safeLabels.map((label, index) => [
      label,
      ...safeSeries.map(series =>
        Array.isArray(series.data) ? safeQuantity(series.data[index]) : 0
      ),
    ]),
  ];
}

export function buildShipmentCategorySummaryRows({
  showExclusive,
  showGeneric,
  exclusive,
  genericAll,
  managed,
} = {}) {
  const rows = [];
  const sumQty = list => asObjectArray(list).reduce((sum, item) => sum + safeQuantity(item.totalQuantity), 0);
  const sumAmt = list => asObjectArray(list).reduce((sum, item) => sum + safeQuantity(item.totalAmount), 0);
  const pushRow = (label, list) => {
    const safeList = asObjectArray(list);
    rows.push([label, safeList.length, sumQty(safeList), sumAmt(safeList)]);
  };
  if (showExclusive) pushRow('전용상품', exclusive);
  if (showGeneric) {
    pushRow('범용상품 전체', genericAll);
    if (asObjectArray(managed).length > 0) pushRow('관리품목', managed);
  }
  return rows;
}

export function buildShipmentReportWorkbookSheets({
  fileLabel,
  scope,
  opts,
  qtyStats,
  amtStats,
  catSummaryRows,
  chartSeries,
  safeSeriesLabels,
  showExclusive,
  showGeneric,
  exclusive,
  genericAll,
  managed,
  notShipped,
} = {}) {
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatSummaryRows = Array.isArray(catSummaryRows)
    ? catSummaryRows
    : buildShipmentCategorySummaryRows({ showExclusive, showGeneric, exclusive, genericAll, managed });
  const sheets = [
    {
      name: '요약',
      rows: [
        ['항목', '값'],
        ['기간', asDisplayText(fileLabel, '—')],
        ['표시 범위', scopeLabel(scope)],
        [],
        ...statsRows('출고량 요약', qtyStats),
        ...(safeOpts.amountSummary ? [[], ...statsRows('출고금액 요약', amtStats)] : []),
      ],
      cols: [{ wch: 24 }, { wch: 18 }],
    },
  ];

  if (safeOpts.catSummary) {
    sheets.push({
      name: '분류별 합계',
      rows: [['분류', '제품수', '출고량', '출고금액(원)'], ...safeCatSummaryRows],
      cols: [{ wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 }],
    });
  }

  if (safeOpts.chart) {
    sheets.push({
      name: '월별 출고량 추이',
      rows: trendRows(safeSeriesLabels, chartSeries),
      cols: [{ wch: 14 }, { wch: 14 }, { wch: 14 }],
    });
  }

  if (safeOpts.fullList && showExclusive) {
    sheets.push({
      name: '전용상품 목록',
      rows: [['순위', '제품명', '분류', '제품코드', '출고량', '출고금액(원)'], ...itemRows(exclusive)],
      cols: [{ wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }],
    });
  }

  if (safeOpts.fullList && showGeneric) {
    sheets.push({
      name: '범용상품 목록',
      rows: [['순위', '제품명', '분류', '제품코드', '출고량', '출고금액(원)'], ...itemRows(genericAll)],
      cols: [{ wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }],
    });
  }

  if (safeOpts.notShippedList) {
    sheets.push({
      name: '미출고 품목',
      rows: [
        ['순위', '제품명', '분류', '제품코드'],
        ...asObjectArray(notShipped).map((item, index) => [
          index + 1,
          productName(item),
          productTypeLabel(item),
          asDisplayText(item.productCode),
        ]),
      ],
      cols: [{ wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 16 }],
    });
  }

  return sheets;
}

export function appendShipmentReportWorkbookSheets(XLSX, wb, sheets) {
  for (const sheet of asObjectArray(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (Array.isArray(sheet.cols)) ws['!cols'] = sheet.cols;
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name));
  }
}

export async function exportShipmentReportXlsx(params = {}) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  appendShipmentReportWorkbookSheets(XLSX, wb, buildShipmentReportWorkbookSheets(params));
  const brandName = getActiveBrand()?.name || '7번가';
  const periodLabel = asDisplayText(params.fileLabel, '출고량');
  XLSX.writeFile(
    wb,
    withDownloadDateSuffix(`${brandName}_${periodLabel} 제때 출고량 보고서.xlsx`)
  );
}
