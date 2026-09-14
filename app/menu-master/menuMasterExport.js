import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { menuAllergenLabel } from '@/lib/menu-master/allergen-summary';

/**
 * 메뉴마스터 행 → CSV 2D 배열 (헤더 포함). 수식 인젝션 방지는 downloadCsv 내 rowsToCsv가 담당.
 * @param {Array} filteredRows
 * @param {{ menuAllergenMap?: Map, recipeSummaryMap?: Map }} [opts] - 있으면 '알레르기' 열 포함
 */
export function buildMenuMasterCsvRows(filteredRows, opts = {}) {
  const { menuAllergenMap, recipeSummaryMap } = opts;
  const includeAllergen = menuAllergenMap instanceof Map;
  const headers = [
    '메뉴코드',
    '메뉴명',
    '규격',
    '판매가',
    '상태',
    '카테고리',
    '중분류',
    ...(includeAllergen ? ['알레르기'] : []),
  ];
  const dataRows = filteredRows.map(r => [
    r.menuCode || '',
    r.menuName || '',
    r.size || '',
    r.price != null ? r.price : '',
    r.status || '',
    r.category || '',
    r.subCategory || '',
    ...(includeAllergen
      ? [menuAllergenLabel(r.menuCode, menuAllergenMap, recipeSummaryMap?.get(r.menuCode))]
      : []),
  ]);
  return [headers, ...dataRows];
}

/** 메뉴마스터 CSV 내보내기. rowsToCsv 경유로 수식 인젝션 방지. */
export function exportMenuMasterCsv(filteredRows, opts = {}) {
  downloadCsv(
    buildMenuMasterCsvRows(filteredRows, opts),
    makeFileNameWithBrand('메뉴마스터', 'csv')
  );
}
