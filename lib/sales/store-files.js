/**
 * lib/sales/store-files.js — sales_files / sales_rows / menu_sales_issues / upload_log
 *
 * 파일 조회 / 업로드 저장 (원자 트랜잭션) / 파일 삭제.
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';

export const SALES_UPLOAD_MODULE = 'menu-sales';

/** 특정 월의 파일 조회 */
export async function getSalesFilesByMonth(year, month) {
  const files = await getAll('sales_files');
  return files.filter(f => f.year === year && f.month === month);
}

/** 월 중복 체크 (year_month 복합 인덱스 우선, 없으면 폴백) */
export async function checkMonthExists(year, month) {
  try {
    const files = await getByIndex('sales_files', 'year_month', [year, month]);
    return files.length > 0;
  } catch {
    const files = await getSalesFilesByMonth(year, month);
    return files.length > 0;
  }
}

/** 모든 업로드된 파일 (이력 표시용, 최신순) */
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

/**
 * sales_files 단건 삭제 — 연결된 sales_rows / menu_sales_issues / upload_log 모두 함께 삭제.
 * store 존재 여부를 체크하여 schema 업그레이드 누락 시에도 안전 동작.
 *
 * @param {number} fileId
 */
export async function deleteSalesFile(fileId) {
  // 1단계: 자식 ID 사전 수집 (각 store 존재 시에만)
  const rowIds = hasStore('sales_rows')
    ? (await getByIndex('sales_rows', 'fileId', fileId)).map(r => r.id)
    : [];
  const issueIds = hasStore('menu_sales_issues')
    ? (await getByIndex('menu_sales_issues', 'fileId', fileId)).map(i => i.id)
    : [];
  // upload_log: linkedFileId + module 양쪽 필터 — 다른 모듈 로그 교차 삭제 방지
  const logIds = hasStore('upload_log')
    ? (await getByIndex('upload_log', 'linkedFileId', fileId))
        .filter(l => l.module === SALES_UPLOAD_MODULE)
        .map(l => l.id)
    : [];

  // 2단계: 한 트랜잭션에서 원자적 삭제 (존재하는 store만 포함)
  const stores = [];
  if (hasStore('sales_files'))        stores.push('sales_files');
  if (hasStore('sales_rows'))         stores.push('sales_rows');
  if (hasStore('menu_sales_issues'))  stores.push('menu_sales_issues');
  if (hasStore('upload_log'))         stores.push('upload_log');

  await runTransaction(stores, 'readwrite', tx => {
    if (hasStore('sales_files'))       tx.objectStore('sales_files').delete(fileId);
    if (rowIds.length > 0) {
      const s = tx.objectStore('sales_rows');
      for (const id of rowIds) s.delete(id);
    }
    if (issueIds.length > 0) {
      const s = tx.objectStore('menu_sales_issues');
      for (const id of issueIds) s.delete(id);
    }
    if (logIds.length > 0) {
      const s = tx.objectStore('upload_log');
      for (const id of logIds) s.delete(id);
    }
  });
}

/**
 * 한 파일의 분류 결과를 새 결과로 교체 — 기존 sales_rows / menu_sales_issues를
 * 모두 지우고 새 classifiedRows / groupedIssues를 같은 트랜잭션에서 다시 삽입한다.
 *
 * 규칙·별칭·제외 변경 후 재분류(reclassify)에서 사용. 삭제와 삽입이 한 트랜잭션이라
 * 중간 실패 시 원본이 보존된다. sales_files / upload_log는 건드리지 않는다.
 *
 * @param {{ id:number, year:number, month:number }} file - 대상 파일 메타
 * @param {Array} classifiedRows
 * @param {Array} groupedIssues
 */
export async function replaceFileClassification(file, classifiedRows, groupedIssues) {
  const fileId = file.id;
  if (fileId == null) throw new Error('replaceFileClassification: file.id 필요');

  // 사전 수집 (트랜잭션 밖) — 기존 자식 레코드 id
  const oldRowIds = hasStore('sales_rows')
    ? (await getByIndex('sales_rows', 'fileId', fileId)).map(r => r.id) : [];
  const oldIssueIds = hasStore('menu_sales_issues')
    ? (await getByIndex('menu_sales_issues', 'fileId', fileId)).map(i => i.id) : [];

  await runTransaction(['sales_rows', 'menu_sales_issues'], 'readwrite', tx => {
    const rowStore   = tx.objectStore('sales_rows');
    const issueStore = tx.objectStore('menu_sales_issues');
    for (const id of oldRowIds)   rowStore.delete(id);
    for (const id of oldIssueIds) issueStore.delete(id);
    // 삭제 요청이 큐에 먼저 들어가고, add는 새 키를 발급받으므로 순서 안전.
    _saveRowsInTx(tx, classifiedRows, fileId, file, (newRowIds) => {
      _saveIssuesInTx(tx, groupedIssues, newRowIds, fileId, file, () => {});
    });
  });
}

/* ============================================================
   saveSalesUpload 내부 헬퍼 (트랜잭션 콜백 안에서 await 금지)
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
    module: SALES_UPLOAD_MODULE,
    linkedFileId: fileId,
    deleted: false,
    deletedAt: null,
  });
  req.onerror = () => tx.abort();
}
