import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';

/** 메뉴마스터 행 → CSV 2D 배열 (헤더 포함). 수식 인젝션 방지는 downloadCsv 내 rowsToCsv가 담당. */
export function buildMenuMasterCsvRows(filteredRows) {
  const headers = ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리'];
  const dataRows = filteredRows.map(r => [
    r.menuCode || '',
    r.menuName || '',
    r.size || '',
    r.price != null ? r.price : '',
    r.status || '',
    r.category || '',
  ]);
  return [headers, ...dataRows];
}

/** 메뉴마스터 CSV 내보내기. rowsToCsv 경유로 수식 인젝션 방지. */
export function exportMenuMasterCsv(filteredRows) {
  downloadCsv(buildMenuMasterCsvRows(filteredRows), makeFileNameWithBrand('메뉴마스터', 'csv'));
}
