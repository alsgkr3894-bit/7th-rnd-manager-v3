/**
 * lib/sales/store.js — sales_files / sales_rows / menu_sales_issues / upload_log 저장 & 조회
 *
 * Phase 1 (업로드)에서 필요한 핵심 함수만 이식.
 * 미매칭 해결 / 삭제 / 통계는 후속 페이즈에서 추가.
 */

import { getAll, getByIndex, runTransaction, hasStore, deleteWithChildren } from '../db';

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

/* ============================================================
   사용자 정의 룰 CRUD (별칭 / 분류 규칙 / 제외)
============================================================ */

/** 모든 사용자 별칭 조회 */
export async function getUserAliases() {
  if (!hasStore('ref_sales_aliases')) return [];
  return getAll('ref_sales_aliases');
}

/** 사용자 별칭 추가 ({ rawName, mappedName }) */
export async function addUserAlias({ rawName, mappedName }) {
  if (!rawName?.trim() || !mappedName?.trim()) throw new Error('rawName과 mappedName은 필수입니다');
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    tx.objectStore('ref_sales_aliases').add({
      rawName: rawName.trim(),
      mappedName: mappedName.trim(),
      enable: true,
      createdAt: new Date().toISOString(),
    });
  });
}

/** 사용자 별칭 삭제 */
export async function deleteUserAlias(id) {
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    tx.objectStore('ref_sales_aliases').delete(id);
  });
}

/** 사용자 별칭 수정 ({ id, rawName?, mappedName?, enable? }) */
export async function updateUserAlias({ id, rawName, mappedName, enable }) {
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    const store = tx.objectStore('ref_sales_aliases');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) { tx.abort(); return; }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (rawName    !== undefined) next.rawName = rawName.trim();
      if (mappedName !== undefined) next.mappedName = mappedName.trim();
      if (enable     !== undefined) next.enable = !!enable;
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}

/** 모든 사용자 분류 규칙 조회 */
export async function getUserRules() {
  if (!hasStore('sales_rules')) return [];
  return getAll('sales_rules');
}

/** 사용자 규칙 추가 ({ rawMenuName, category, groupName, detailName? }) */
export async function addUserRule({ rawMenuName, category, groupName, detailName }) {
  if (!rawMenuName?.trim() || !category || !groupName?.trim()) {
    throw new Error('rawMenuName, category, groupName은 필수입니다');
  }
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    tx.objectStore('sales_rules').add({
      rawMenuName: rawMenuName.trim(),
      matchType: 'exact',
      pattern: rawMenuName.trim(),
      category,
      groupName: groupName.trim(),
      detailName: (detailName || '').trim() || groupName.trim(),
      enable: true,
      createdAt: new Date().toISOString(),
    });
  });
}

/** 사용자 규칙 삭제 */
export async function deleteUserRule(id) {
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    tx.objectStore('sales_rules').delete(id);
  });
}

/** 사용자 규칙 수정 ({ id, rawMenuName?, category?, groupName?, detailName?, enable? }) */
export async function updateUserRule({ id, rawMenuName, category, groupName, detailName, enable }) {
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    const store = tx.objectStore('sales_rules');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) { tx.abort(); return; }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (rawMenuName !== undefined) { next.rawMenuName = rawMenuName.trim(); next.pattern = rawMenuName.trim(); }
      if (category    !== undefined) next.category = category;
      if (groupName   !== undefined) next.groupName = groupName.trim();
      if (detailName  !== undefined) next.detailName = (detailName || '').trim() || (groupName ?? cur.groupName);
      if (enable      !== undefined) next.enable = !!enable;
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}

/** 모든 사용자 제외 메뉴 조회 */
export async function getUserExcluded() {
  if (!hasStore('ref_excluded')) return [];
  return getAll('ref_excluded');
}

/** 사용자 제외 메뉴 추가 ({ menuName }) */
export async function addUserExcluded({ menuName }) {
  if (!menuName?.trim()) throw new Error('menuName은 필수입니다');
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').add({
      menuName: menuName.trim(),
      createdAt: new Date().toISOString(),
    });
  });
}

/** 사용자 제외 메뉴 삭제 */
export async function deleteUserExcluded(id) {
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').delete(id);
  });
}

/** 사용자 제외 메뉴 수정 ({ id, menuName? }) — enable 컬럼은 ref_excluded 스키마에 없으므로 menuName만 */
export async function updateUserExcluded({ id, menuName }) {
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    const store = tx.objectStore('ref_excluded');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) { tx.abort(); return; }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (menuName !== undefined) next.menuName = menuName.trim();
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
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
  const logIds = hasStore('upload_log')
    ? (await getAll('upload_log')).filter(l => l.linkedFileId === fileId).map(l => l.id)
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
 * 모든 미매칭 issue 조회.
 * @param {object} opts — { status?: 'open'|'resolved'|null, year?, month? }
 */
export async function getIssues(opts = {}) {
  if (!hasStore('menu_sales_issues')) return [];
  const { status, year, month } = opts;
  const all = await getAll('menu_sales_issues');
  return all
    .filter(i => {
      if (status && i.status !== status) return false;
      if (year != null && i.year !== year) return false;
      if (month != null && i.month !== month) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return (b.totalQuantity || 0) - (a.totalQuantity || 0);
    });
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
