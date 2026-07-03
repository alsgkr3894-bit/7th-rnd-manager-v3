import { loadXlsx } from '@/lib/excel';
import { withDownloadDateSuffix } from '@/lib/download';
import { getActiveBrand } from '@/lib/active-brand';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { groupCostMenusBySize } from '@/lib/report/cost-menu-display';

function formatRateValue(menu) {
  return menu?.rate > 0 ? Math.round(menu.rate * 10) / 10 : '';
}

function costTableCells(menu) {
  return [menu?.sale || '', menu?.cost || '', formatRateValue(menu)];
}

export async function exportCostXlsx(periodLabel, activeCats, recipeRows, riskThreshold = 35) {
  const XLSX = await loadXlsx();
  const periodPart = periodLabel.replace(
    /(\d+)년 (\d+)월/,
    (_, y, m) => `${y}년${m.padStart(2, '0')}월`
  );
  const wb = XLSX.utils.book_new();

  // 시트1: 카테고리 요약
  const summaryRows = [
    ['카테고리', '메뉴 수', '평균 원가율(%)', '최저(%)', '최고(%)', '위험 메뉴'],
    ...activeCats.map(([, c]) => {
      const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
      const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      return [
        c.label,
        c.menus.length,
        avg > 0 ? Math.round(avg * 10) / 10 : '',
        rates.length ? Math.round(Math.min(...rates) * 10) / 10 : '',
        rates.length ? Math.round(Math.max(...rates) * 10) / 10 : '',
        c.menus.filter(m => m.rate >= riskThreshold).length,
      ];
    }),
  ];
  const sheet1 = XLSX.utils.aoa_to_sheet(summaryRows);
  sheet1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, sheet1, '카테고리 요약');

  // 시트2: 메뉴 상세 (원가마진표처럼 메뉴 1줄에 L/R/단일 원가를 배치)
  const detailRows = [
    [
      '카테고리',
      '메뉴명',
      'L판매가(원)',
      'L원가(원)',
      'L원가율(%)',
      'R판매가(원)',
      'R원가(원)',
      'R원가율(%)',
      '단일판매가(원)',
      '단일원가(원)',
      '단일원가율(%)',
    ],
    ...activeCats.flatMap(([, c]) =>
      groupCostMenusBySize(
        [...c.menus].sort(
          (a, b) =>
            getMenuCodeRank(a.code) - getMenuCodeRank(b.code) ||
            (a.code || '').localeCompare(b.code || '', 'ko')
        )
      ).map(group => [
        c.label,
        group.name,
        ...costTableCells(group.sizes.L),
        ...costTableCells(group.sizes.R),
        ...costTableCells(group.single),
      ])
    ),
  ];
  const sheet2 = XLSX.utils.aoa_to_sheet(detailRows);
  sheet2['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet2, '메뉴 상세');

  // 시트3: 레시피 출력
  const recipeSheetRows = [
    [
      '카테고리',
      '메뉴코드',
      '메뉴명',
      '규격',
      '구분',
      '원가식자재',
      '제품코드',
      '수량',
      '단위',
      '단가(원)',
      '소계(원)',
      '레시피합계(원)',
      '비고',
    ],
    ...(Array.isArray(recipeRows) ? recipeRows : []).flatMap(row => {
      const components = Array.isArray(row.components) ? row.components : [];
      if (!components.length) {
        return [
          [
            row.categoryLabel,
            row.menuCode,
            row.menuName,
            row.size,
            '직접 입력',
            '구성품 미작성',
            '',
            '',
            '',
            '',
            '',
            '',
            row.note || '',
          ],
        ];
      }
      return components.map((component, index) => [
        row.categoryLabel,
        row.menuCode,
        row.menuName,
        row.size,
        component.sourceLabel || (component.sourceType === 'common' ? '공통관리' : '직접 입력'),
        component.ingredientName,
        component.productCode,
        component.quantity ?? '',
        component.unit || '',
        component.unitPrice ?? '',
        component.subtotal ?? '',
        index === 0 ? row.totalCost || '' : '',
        component.note || row.note || '',
      ]);
    }),
  ];
  const sheet3 = XLSX.utils.aoa_to_sheet(recipeSheetRows);
  sheet3['!cols'] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet3, '레시피 출력');

  XLSX.writeFile(
    wb,
    withDownloadDateSuffix(`${getActiveBrand().name}_${periodPart} 원가계산 보고서.xlsx`)
  );
}
