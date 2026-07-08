import { getActiveBrand } from '@/lib/active-brand';
import { withDownloadDateSuffix } from '@/lib/download';
import { loadXlsx } from '@/lib/excel';
import { safeSheetName } from '@/lib/sales/export-xlsx';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

function safePrice(value) {
  return asFiniteNumber(value, null);
}

function safePercent(value) {
  const n = asFiniteNumber(value, null);
  return n == null ? '' : Math.round(n * 1000) / 10;
}

function countStatus(changes, status) {
  return changes.filter(change => asDisplayText(change.changeStatus) === status).length;
}

function changeAmount(change) {
  const status = asDisplayText(change.changeStatus);
  if (status === '신규' || status === '삭제') return '';
  const basePrice = safePrice(change.basePrice);
  const latestPrice = safePrice(change.latestPrice);
  if (basePrice == null || latestPrice == null) return '';
  return latestPrice - basePrice;
}

function changeRow(change) {
  const status = asDisplayText(change.changeStatus);
  return [
    asDisplayText(change.temperature, '기타') || '기타',
    asDisplayText(change.productCode),
    asDisplayText(change.productName, '—') || '—',
    status || '—',
    safePrice(change.basePrice) ?? '',
    safePrice(change.latestPrice) ?? '',
    changeAmount(change),
    status === '신규' || status === '삭제' ? '' : safePercent(change.changeRate),
  ];
}

function buildPriceSummaryRows({ dateRange, changes, opts }) {
  return [
    ['항목', '값'],
    ['기간', asDisplayText(dateRange, '—')],
    ['총 변동', changes.length],
    ['인상', countStatus(changes, '인상')],
    ['인하', countStatus(changes, '인하')],
    ['신규', countStatus(changes, '신규')],
    ['삭제', countStatus(changes, '삭제')],
    ['전체 식자재 변동 요약 포함', opts.catSummary ? '포함' : '제외'],
    ['원가 영향 식자재 포함', opts.costImpact ? '포함' : '제외'],
  ];
}

function buildCategorySummaryRows(catSummary) {
  return [
    ['분류', '총 변동', '인상', '인하', '신규', '삭제', '평균 변동률(%)'],
    ...catSummary.map(category => {
      const count = asFiniteNumber(category.count, 0) ?? 0;
      const sum = asFiniteNumber(category.sum, 0) ?? 0;
      return [
        asDisplayText(category.cat, '전체') || '전체',
        asFiniteNumber(category.total, 0) ?? 0,
        asFiniteNumber(category.up, 0) ?? 0,
        asFiniteNumber(category.down, 0) ?? 0,
        asFiniteNumber(category.newItem, 0) ?? 0,
        asFiniteNumber(category.del, 0) ?? 0,
        count > 0 ? Math.round((sum / count) * 10) / 10 : '',
      ];
    }),
  ];
}

export function buildPriceReportWorkbookSheets({ dateRange, changes, catSummary, opts } = {}) {
  const safeChanges = asObjectArray(changes);
  const safeCatSummary = asObjectArray(catSummary);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const sheets = [
    {
      name: '요약',
      rows: buildPriceSummaryRows({ dateRange, changes: safeChanges, opts: safeOpts }),
      cols: [{ wch: 24 }, { wch: 30 }],
    },
  ];

  if (safeOpts.catSummary) {
    sheets.push({
      name: '전체 식자재 변동 요약',
      rows: buildCategorySummaryRows(safeCatSummary),
      cols: [
        { wch: 16 },
        { wch: 10 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 16 },
      ],
    });
  }

  if (safeOpts.costImpact) {
    sheets.push({
      name: '원가 영향 식자재',
      rows: [
        ['상태', '건수'],
        ['인상', countStatus(safeChanges, '인상')],
        ['인하', countStatus(safeChanges, '인하')],
        ['신규', countStatus(safeChanges, '신규')],
        ['삭제', countStatus(safeChanges, '삭제')],
      ],
      cols: [{ wch: 12 }, { wch: 10 }],
    });
  }

  sheets.push({
    name: '변동 품목',
    rows: [
      ['분류', '제품코드', '제품명', '상태', '이전 단가(원)', '현재 단가(원)', '변동액(원)', '변동률(%)'],
      ...safeChanges.map(changeRow),
    ],
    cols: [
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ],
  });

  return sheets;
}

export function appendPriceReportWorkbookSheets(XLSX, wb, sheets) {
  for (const sheet of asObjectArray(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (Array.isArray(sheet.cols)) ws['!cols'] = sheet.cols;
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name));
  }
}

export async function exportPriceReportXlsx(params = {}) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  appendPriceReportWorkbookSheets(XLSX, wb, buildPriceReportWorkbookSheets(params));
  const brandName = getActiveBrand()?.name || '7번가';
  const periodLabel = asDisplayText(params.dateRange, '가격 변동');
  XLSX.writeFile(
    wb,
    withDownloadDateSuffix(`${brandName}_${periodLabel} 제때 가격 변동 보고서.xlsx`)
  );
}
