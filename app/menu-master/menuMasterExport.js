/**
 * 메뉴마스터 CSV 문자열 조립.
 * @param {Array} filteredRows
 * @returns {string}
 */
export function buildMenuMasterCsv(filteredRows) {
  const headers = ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리'];
  const dataRows = filteredRows.map(r => [
    r.menuCode || '',
    r.menuName || '',
    r.size || '',
    r.price != null ? String(r.price) : '',
    r.status || '',
    r.category || '',
  ]);
  return [headers, ...dataRows]
    .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
    .join('\n');
}
