/**
 * lib/sales/store.js — sales_files / sales_rows / menu_sales_issues / upload_log 저장 & 조회
 *
 * Phase 1 (업로드)에서 필요한 핵심 함수만 이식.
 * 미매칭 해결 / 삭제 / 통계는 후속 페이즈에서 추가.
 */

import { getAll, getByIndex, runTransaction } from '../db';

/**
 * 특정 월의 파일 조회
 */
export async function getSalesFilesByMonth(year, month) {
  const files = await getAll('sales_files');
  return files.filter(f => f.year === year && f.month === month);
}

/**
 * 월 중복 체크 (year_month 복합 인덱스 우선, 없으면 폴백)
 */
export async function checkMonthExists(year, month) {
  try {
    const files = await getByIndex('sales_files', 'year_month', [year, month]);
    return files.length > 0;
  } catch {
    const files = await getSalesFilesByMonth(year, month);
    return files.length > 0;
  }
}

/**
 * 모든 업로드된 파일 (이력 표시용, 최신순)
 */
export async function getUploadedFiles() {
  const files = await getAll('sales_files');
  return files.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
  });
}

/**
 * sales_files + sales_rows + menu_sales_issues + upload_log 원자적 저장.
 *
 * payload:
 *   - meta: { year, month, fileName, uploadedAt, totalRows }
 *   - classifiedRows: [{ rawMenuName, normalizedMenuName, mappedMenuName, status,
 *                        category, groupName, detailName, quantity, originalIndex }, ...]
 *   - groupedIssues: [{ issueType, normalizedMenuName, representativeRawMenuName,
 *                       totalQuantity, affectedRowCount, relatedRowPositions, status }, ...]
 *   - log: { module, fileName, fileHash?, uploadedAt, totalRows, validCount, invalidCount, year, month }
 *
 * @returns {number} fileId
 * @throws Error('DUPLICATE_MONTH')
 */
export async function saveSalesUpload({ meta, classifiedRows, groupedIssues, log }) {
  const dup = await checkMonthExists(meta.year, meta.month);
  if (dup) throw new Error('DUPLICATE_MONTH');

  let fileId;
  await runTransaction(
    ['sales_files', 'sales_rows', 'menu_sales_issues', 'upload_log'],
    'readwrite',
    (tx) => {
      const fileReq = tx.objectStore('sales_files').add(meta);
      fileReq.onerror = () => tx.abort();
      fileReq.onsuccess = () => {
        fileId = fileReq.result;
        _saveRowsInTx(tx, classifiedRows, fileId, meta, (rowIds) => {
          _saveIssuesInTx(tx, groupedIssues, rowIds, fileId, meta, () => {
            _saveUploadLog(tx, log, fileId);
          });
        });
      };
    },
  );
  return fileId;
}

/* ============================================================
   트랜잭션 내부 헬퍼 (await 금지)
============================================================ */

function _saveRowsInTx(tx, classifiedRows, fileId, meta, onComplete) {
  const rowStore = tx.objectStore('sales_rows');
  const rows = classifiedRows.map(r => ({ ...r, fileId, year: meta.year, month: meta.month }));
  if (rows.length === 0) { onComplete([]); return; }

  const rowIds = [];
  let added = 0;
  rows.forEach((r, idx) => {
    const req = rowStore.add(r);
    req.onerror = () => tx.abort();
    req.onsuccess = () => {
      rowIds[idx] = req.result;
      if (++added === rows.length) onComplete(rowIds);
    };
  });
}

function _saveIssuesInTx(tx, groupedIssues, rowIds, fileId, meta, onComplete) {
  if (groupedIssues.length === 0) { onComplete(); return; }

  const issueStore = tx.objectStore('menu_sales_issues');
  const issues = groupedIssues.map(it => ({
    issueType: it.issueType,
    normalizedMenuName: it.normalizedMenuName,
    representativeRawMenuName: it.representativeRawMenuName,
    totalQuantity: it.totalQuantity,
    affectedRowCount: it.affectedRowCount,
    relatedSalesRowIds: it.relatedRowPositions.map(pos => rowIds[pos]),
    status: it.status,
    fileId,
    year: meta.year,
    month: meta.month,
    createdAt: new Date().toISOString(),
  }));

  let added = 0;
  issues.forEach(it => {
    const req = issueStore.add(it);
    req.onerror = () => tx.abort();
    req.onsuccess = () => { if (++added === issues.length) onComplete(); };
  });
}

function _saveUploadLog(tx, log, fileId) {
  const req = tx.objectStore('upload_log').add({
    ...log,
    linkedFileId: fileId,
    deleted: false,
    deletedAt: null,
  });
  req.onerror = () => tx.abort();
}
