/**
 * lib/sales/resolve.js — 미매칭 issue 해결 (트랜잭션)
 *
 * 흐름 (1 트랜잭션):
 *   1. issue 조회 → normalizedMenuName + relatedSalesRowIds 획득
 *   2. 중복 검사 (alias/rule/exclude)
 *   3. 기준 데이터 저장 (ref_sales_aliases | sales_rules | ref_excluded)
 *   4. 영향 sales_rows 재처리
 *   5. issue status = 'resolved'
 *
 * 오류 시 트랜잭션 abort + 의미 있는 code 반환.
 */

import { getById, getByIndex, initDB } from '../db';
import { queueCapturedStoreSync, wrapTransactionForServerSync } from '../db/server-sync';
import { normalizeMenuName } from './normalize.js';
import { buildClassifierFromDB } from './classifier-db.js';
import { classifyMenuStatus } from './status.js';
import {
  ISSUE_BASIS_INDEX,
  checkDuplicateInTx,
  isEquivalentIssueBasis,
  saveIssueBasisInTx,
  reprocessRowsInTx,
  updateIssueStatusInTx,
} from './resolve-helpers.js';
import { assertActiveAdmin } from '@/lib/auth/guard';

const ACTION_STORES = {
  alias: 'ref_sales_aliases',
  rule: 'sales_rules',
  exclude: 'ref_excluded',
};

/**
 * 여러 미매칭 issue에 동일 분류 rule을 일괄 적용.
 *
 * @param {Array<number>} issueIds
 * @param {{ category, groupName, detailName? }} ruleData
 * @returns {{ resolved: number[], failed: [{ id, code, message }] }}
 */
export async function bulkResolveRule(issueIds, ruleData) {
  await assertActiveAdmin('판매량 미매칭 일괄 분류');
  const resolved = [];
  const failed = [];
  for (const id of issueIds) {
    try {
      await resolveUnmatchedIssue(id, 'rule', ruleData, { skipAdminGuard: true });
      resolved.push(id);
    } catch (err) {
      failed.push({ id, code: err?.code || 'UNKNOWN', message: err?.message || String(err) });
    }
  }
  return { resolved, failed };
}

/**
 * 여러 미매칭 issue를 일괄 제외 처리.
 * 각 issue마다 resolveUnmatchedIssue('exclude') 순차 실행.
 *
 * @param {Array<number>} issueIds
 * @returns {{ resolved: number[], failed: [{ id, code, message }] }}
 */
export async function bulkExcludeIssues(issueIds) {
  await assertActiveAdmin('판매량 미매칭 일괄 제외');
  const resolved = [];
  const failed = [];
  for (const id of issueIds) {
    try {
      await resolveUnmatchedIssue(id, 'exclude', {}, { skipAdminGuard: true });
      resolved.push(id);
    } catch (err) {
      failed.push({ id, code: err?.code || 'UNKNOWN', message: err?.message || String(err) });
    }
  }
  return { resolved, failed };
}

async function hasEquivalentBasis(recordStore, issueId, actionType, actionData) {
  try {
    const issue = await getById('menu_sales_issues', issueId);
    const name = String(issue?.normalizedMenuName ?? '').trim();
    if (!name) return false;
    const rows = await getByIndex(recordStore, ISSUE_BASIS_INDEX[actionType], name);
    const existing = (Array.isArray(rows) ? rows : []).find(Boolean);
    return isEquivalentIssueBasis(existing, actionType, actionData);
  } catch {
    return false;
  }
}

/**
 * @param {number} issueId
 * @param {'alias'|'rule'|'exclude'} actionType
 * @param {object} actionData
 *   - alias:   { outputName }
 *   - rule:    { category, groupName, detailName? }
 *   - exclude: {}
 */
export async function resolveUnmatchedIssue(issueId, actionType, actionData, options = {}) {
  if (!ACTION_STORES[actionType]) {
    return Promise.reject({
      code: 'INVALID_ACTION_TYPE',
      message: `잘못된 조치 유형: ${actionType}`,
    });
  }
  if (!options?.skipAdminGuard) await assertActiveAdmin('판매량 미매칭 해결');
  const recordStore = ACTION_STORES[actionType];
  const db = await initDB();
  // 별칭은 업로드·재분류와 같은 분류기(DB 규칙 + 7번가 정적 규칙)로 맞춘다 — 정적 규칙만 쓰면
  // 이천밥쌤·차이나X4는 규칙이 없다고 항상 실패했고, 7번가도 사용자가 추가한 DB 규칙을 못 봤다.
  const classifier = await buildClassifierFromDB();
  const matchRule = name => classifier.matchRule(name);
  // 다른 달 파일에서 같은 메뉴를 이미 같은 내용으로 해결했으면 기준 저장은 건너뛰고 행만 재처리
  const reuseBasis = await hasEquivalentBasis(recordStore, issueId, actionType, actionData);

  return new Promise((resolve, reject) => {
    const rawTx = db.transaction([recordStore, 'sales_rows', 'menu_sales_issues'], 'readwrite');
    const captures = [];
    const tx = wrapTransactionForServerSync(rawTx, captures);
    let abortReason = null;
    const setAbortReason = r => {
      abortReason = r;
    };

    try {
      const issueStore = tx.objectStore('menu_sales_issues');
      const getIssue = issueStore.get(issueId);

      getIssue.onsuccess = () => {
        const issue = getIssue.result;
        if (!issue) {
          setAbortReason({ code: 'ISSUE_NOT_FOUND', message: '이슈를 찾을 수 없습니다.' });
          tx.abort();
          return;
        }
        const normalizedMenuName = issue.normalizedMenuName;
        const relatedSalesRowIds = Array.isArray(issue.relatedSalesRowIds)
          ? issue.relatedSalesRowIds
          : [];

        if (relatedSalesRowIds.length === 0) {
          setAbortReason({ code: 'RELATED_ROWS_EMPTY', message: '처리할 관련 행이 없습니다.' });
          tx.abort();
          return;
        }

        if (!reuseBasis) {
          // Step 2: 중복 검사
          checkDuplicateInTx(tx, recordStore, normalizedMenuName, actionType, setAbortReason);
          // Step 3: 기준 데이터 저장
          saveIssueBasisInTx(
            tx,
            recordStore,
            normalizedMenuName,
            actionType,
            actionData,
            setAbortReason
          );
        }
        // Step 4: 영향 행 재처리 → Step 5: issue status 변경
        reprocessRowsInTx(
          tx,
          relatedSalesRowIds,
          actionType,
          actionData,
          { normalizeMenuName, matchRule, classifyMenuStatus },
          setAbortReason,
          () => updateIssueStatusInTx(tx, issueId, setAbortReason)
        );
      };

      getIssue.onerror = () => {
        setAbortReason({
          code: 'ISSUE_QUERY_FAILED',
          message: '이슈 조회 중 오류가 발생했습니다.',
        });
        tx.abort();
      };

      rawTx.oncomplete = () => {
        queueCapturedStoreSync(captures);
        resolve();
      };
      rawTx.onerror = () =>
        reject(
          abortReason || {
            code: 'TX_ERROR',
            message: `데이터베이스 오류: ${tx.error?.message || '알 수 없는 오류'}`,
          }
        );
      rawTx.onabort = () =>
        reject(abortReason || { code: 'TX_ABORT', message: '작업이 중단되었습니다.' });
    } catch (err) {
      try {
        tx.abort();
      } catch {}
      reject({ code: 'SYNC_ERROR', message: `동기 오류: ${err.message}` });
    }
  });
}
