import { withDownloadDateSuffix } from '@/lib/download';
import { safeQuantity } from '@/lib/report/period';
import { safeRevenue } from '@/lib/sales/revenue';
import { safeSheetName } from '@/lib/sales/export-xlsx';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const DEFAULT_BRAND_NAME = '7번가';

function formatSignedPercent(value) {
  const n = asFiniteNumber(value, null);
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function getScopeLabel(scope) {
  if (scope === 'all') return '전체';
  if (scope === 'pizza') return '피자';
  return asDisplayText(scope, '전체');
}

function getSizeQuantity(item, size) {
  const found = asObjectArray(item?.sizes).find(row => asDisplayText(row.size) === size);
  return safeQuantity(found?.quantity);
}

function getSizeRevenue(item, size) {
  const found = asObjectArray(item?.sizes).find(row => asDisplayText(row.size) === size);
  return safeRevenue(found?.revenue);
}

export function formatSalesReportPeriodPart(periodLabel) {
  const label = asDisplayText(periodLabel, '');
  return label.replace(/(\d+)년\s+(\d+)월/, (_, y, m) => `${y}년${m.padStart(2, '0')}월`);
}

export function buildSalesReportFileName({ brandName, periodLabel } = {}) {
  return `${asDisplayText(brandName, DEFAULT_BRAND_NAME)}_${formatSalesReportPeriodPart(
    periodLabel
  )} 판매량 보고서.xlsx`;
}

export function buildSalesReportWorkbookSheets({
  periodLabel,
  scope,
  kpi,
  catShares,
  groupRanking,
  opts,
} = {}) {
  const safePeriodLabel = asDisplayText(periodLabel);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  const totalShare = safeCatShares.reduce((sum, item) => sum + safeQuantity(item.value), 0);
  const showRevenue = !!safeOpts.revenue;

  const sheets = [
    {
      name: '요약',
      rows: [
        ['항목', '값'],
        ['기간', safePeriodLabel],
        ['대상', getScopeLabel(scope)],
        ['총 판매량', safeQuantity(kpi?.current)],
        ...(showRevenue ? [['총 매출액', safeRevenue(kpi?.revenue)]] : []),
        ['전월 판매량', safeQuantity(kpi?.previous)],
        ...(showRevenue ? [['전월 매출액', safeRevenue(kpi?.previousRevenue)]] : []),
        ['전월 대비(%)', formatSignedPercent(kpi?.deltaPct)],
        ...(showRevenue ? [['매출 전월 대비(%)', formatSignedPercent(kpi?.revenueDeltaPct)]] : []),
        ['카테고리 수', safeCatShares.length],
      ],
    },
    {
      name: '카테고리별 비중',
      rows: [
        ['카테고리', '판매량', ...(showRevenue ? ['매출액'] : []), '비중(%)'],
        ...safeCatShares.map(item => [
          asDisplayText(item.name, '미분류'),
          safeQuantity(item.value),
          ...(showRevenue ? [safeRevenue(item.revenue)] : []),
          totalShare > 0 ? ((safeQuantity(item.value) / totalShare) * 100).toFixed(1) : '0',
        ]),
      ],
    },
  ];

  const rankHeaders = ['순위', '메뉴명', '카테고리', '판매량'];
  if (showRevenue) rankHeaders.push('매출액');
  if (safeOpts.prevComp) rankHeaders.push('전월', '증감', '증감(%)');
  if (safeOpts.variant) {
    if (showRevenue) rankHeaders.push('L판매', 'L매출', 'R판매', 'R매출', '기타', '기타매출');
    else rankHeaders.push('L판매', 'R판매', '기타');
  }

  sheets.push({
    name: '전체 메뉴 순위',
    rows: [
      rankHeaders,
      ...safeGroupRanking.map(item => {
        const row = [
          asFiniteNumber(item.rank, 0) ?? 0,
          asDisplayText(item.name, '—'),
          asDisplayText(item.category),
          safeQuantity(item.quantity),
        ];
        if (showRevenue) row.push(safeRevenue(item.revenue));
        if (safeOpts.prevComp) {
          row.push(
            safeQuantity(item.prevQty),
            safeQuantity(item.delta),
            formatSignedPercent(item.deltaPct)
          );
        }
        if (safeOpts.variant) {
          const l = getSizeQuantity(item, 'L');
          const r = getSizeQuantity(item, 'R');
          const lRevenue = getSizeRevenue(item, 'L');
          const rRevenue = getSizeRevenue(item, 'R');
          const etc = safeQuantity(item.quantity) - l - r;
          const etcRevenue = safeRevenue(item.revenue) - lRevenue - rRevenue;
          if (showRevenue) row.push(l, lRevenue, r, rRevenue, etc > 0 ? etc : 0, etcRevenue);
          else row.push(l, r, etc > 0 ? etc : 0);
        }
        return row;
      }),
    ],
  });

  const usedSheetNames = new Map();
  const categories = [
    ...new Set(safeGroupRanking.map(item => asDisplayText(item.category)).filter(Boolean)),
  ];
  for (const category of categories) {
    const items = safeGroupRanking.filter(item => asDisplayText(item.category) === category);
    const rows = [
      [
        '순위',
        '메뉴명',
        '판매량',
        ...(showRevenue ? ['매출액'] : []),
        ...(safeOpts.prevComp ? ['전월', '증감'] : []),
      ],
      ...items.map((item, index) => [
        index + 1,
        asDisplayText(item.name, '—'),
        safeQuantity(item.quantity),
        ...(showRevenue ? [safeRevenue(item.revenue)] : []),
        ...(safeOpts.prevComp ? [safeQuantity(item.prevQty), safeQuantity(item.delta)] : []),
      ]),
    ];
    const baseName = safeSheetName(category);
    const count = usedSheetNames.get(baseName) ?? 0;
    usedSheetNames.set(baseName, count + 1);
    sheets.push({
      name: count > 0 ? safeSheetName(category, { suffix: `(${count})` }) : baseName,
      rows,
    });
  }

  return sheets;
}

export function appendSalesReportWorkbookSheets(XLSX, wb, sheets) {
  for (const sheet of asObjectArray(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  }
}

export function exportSalesReportWorkbook(XLSX, params = {}) {
  const wb = XLSX.utils.book_new();
  appendSalesReportWorkbookSheets(XLSX, wb, buildSalesReportWorkbookSheets(params));
  const fileName = buildSalesReportFileName(params);
  XLSX.writeFile(wb, withDownloadDateSuffix(fileName));
}
