import { downloadCsv } from '@/lib/download';
import { MODULE_GROUPS } from '@/lib/db';

/**
 * 필터링된 백업 이력을 CSV 파일로 다운로드한다.
 * @param {Array} filteredHistory - 현재 필터 조건을 거친 이력 목록
 */
export function exportHistoryCsv(filteredHistory) {
  const headers = ['백업 ID', '일시', '범위', '행 수', '파일명', '고정'];
  const rows = filteredHistory.map(h => [
    h.id || '',
    h.at ? new Date(h.at).toLocaleString('ko-KR') : '',
    (h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(', ') || '전체',
    h.totalRows ?? '',
    h.fileName || '',
    h.pinned ? 'Y' : '',
  ]);
  downloadCsv([headers, ...rows], '백업이력.csv');
}
