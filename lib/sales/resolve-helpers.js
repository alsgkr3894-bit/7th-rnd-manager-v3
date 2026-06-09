/**
 * lib/sales/resolve-helpers.js — resolveUnmatchedIssue 트랜잭션 내부 헬퍼
 *
 * 모든 함수는 IDB 트랜잭션 콜백 안에서 호출.
 * await 금지 — onsuccess 콜백 체인으로 작성.
 */

/** 중복 검사 (이미 등록된 alias/rule/exclude면 abort) */
export function checkDuplicateInTx(tx, storeName, normalizedMenuName, actionType, setAbortReason) {
  const store = tx.objectStore(storeName);
  const config = {
    alias: { indexName: 'rawName', code: 'ALIAS_ALREADY_EXISTS', msg: '이미 등록된 별칭' },
    rule: { indexName: 'rawMenuName', code: 'RULE_ALREADY_EXISTS', msg: '이미 등록된 규칙' },
    exclude: { indexName: 'menuName', code: 'EXCLUDED_ALREADY_EXISTS', msg: '이미 제외된 항목' },
  }[actionType];

  const req = store.index(config.indexName).get(normalizedMenuName);
  req.onsuccess = () => {
    if (req.result) {
      setAbortReason({ code: config.code, message: `${config.msg}: ${normalizedMenuName}` });
      tx.abort();
    }
  };
  req.onerror = () => {
    setAbortReason({
      code: 'DUPLICATE_CHECK_FAILED',
      message: '중복 검사 중 오류가 발생했습니다.',
    });
    tx.abort();
  };
}

/** 기준 데이터 저장 (ref_sales_aliases | sales_rules | ref_excluded) */
export function saveIssueBasisInTx(
  tx,
  storeName,
  normalizedMenuName,
  actionType,
  actionData,
  setAbortReason
) {
  const now = new Date().toISOString();
  const record =
    actionType === 'alias'
      ? {
          rawName: normalizedMenuName,
          mappedName: actionData.outputName,
          enable: true,
          createdAt: now,
        }
      : actionType === 'rule'
        ? {
            rawMenuName: normalizedMenuName,
            matchType: 'exact',
            pattern: normalizedMenuName,
            category: actionData.category,
            groupName: actionData.groupName,
            detailName: actionData.detailName || null,
            enable: true,
            createdAt: now,
          }
        : { menuName: normalizedMenuName, createdAt: now };

  const req = tx.objectStore(storeName).add(record);
  req.onerror = () => {
    setAbortReason({
      code: 'BASIS_SAVE_FAILED',
      message: '기준 데이터 저장 중 오류가 발생했습니다.',
    });
    tx.abort();
  };
}

/**
 * 영향받은 sales_rows 재처리.
 * @param {object} deps — { normalizeMenuName, matchRule, classifyMenuStatus }
 * @param {function} onComplete — 모든 행 처리 완료 시 호출
 */
export function reprocessRowsInTx(
  tx,
  rowIds,
  actionType,
  actionData,
  deps,
  setAbortReason,
  onComplete
) {
  if (!rowIds || rowIds.length === 0) {
    onComplete?.();
    return;
  }

  const rowStore = tx.objectStore('sales_rows');
  let processed = 0;
  const unclassifiedAfterAlias = [];

  rowIds.forEach(rowId => {
    const getReq = rowStore.get(rowId);
    getReq.onsuccess = () => {
      const row = getReq.result;
      if (!row) {
        setAbortReason({
          code: 'RELATED_ROW_NOT_FOUND',
          message: `처리할 행을 찾을 수 없습니다. (rowId: ${rowId})`,
        });
        tx.abort();
        return;
      }

      const updated = applyAction(row, actionType, actionData, deps);
      if (
        actionType === 'alias' &&
        updated.status !== 'classified' &&
        updated.status !== 'excluded'
      ) {
        unclassifiedAfterAlias.push(rowId);
      }

      const putReq = rowStore.put(updated);
      putReq.onerror = () => {
        setAbortReason({
          code: 'RELATED_ROW_UPDATE_FAILED',
          message: '행 업데이트 중 오류가 발생했습니다.',
        });
        tx.abort();
      };
      putReq.onsuccess = () => {
        if (++processed !== rowIds.length) return;
        if (actionType === 'alias' && unclassifiedAfterAlias.length > 0) {
          setAbortReason({
            code: 'ALIAS_NO_MATCHING_RULE',
            message:
              '별칭 대상이 기존 분류 규칙과 연결되지 않습니다. 분류 규칙 등록을 사용해 주세요.',
          });
          tx.abort();
          return;
        }
        onComplete?.();
      };
    };
    getReq.onerror = () => {
      setAbortReason({
        code: 'RELATED_ROW_QUERY_FAILED',
        message: '행 조회 중 오류가 발생했습니다.',
      });
      tx.abort();
    };
  });
}

/** action 종류에 따라 row 업데이트 객체 생성 */
function applyAction(row, actionType, actionData, deps) {
  const now = new Date().toISOString();
  if (actionType === 'alias') {
    const normalizedMenuName = deps.normalizeMenuName(row.rawMenuName);
    const mappedMenuName = actionData.outputName;
    const matchedRule = deps.matchRule(mappedMenuName);
    const result = deps.classifyMenuStatus({
      rawMenuName: row.rawMenuName,
      normalizedMenuName,
      mappedMenuName,
      matchedRule,
      exclusionDecision: matchedRule?.category === '품목제외' ? 'excluded' : null,
    });
    return {
      ...row,
      updatedAt: now,
      normalizedMenuName,
      mappedMenuName,
      status: result.status,
      category: result.category,
      groupName: result.groupName,
      detailName: result.detailName,
    };
  }
  if (actionType === 'rule') {
    return {
      ...row,
      updatedAt: now,
      status: 'classified',
      category: actionData.category,
      groupName: actionData.groupName,
      detailName: actionData.detailName || null,
    };
  }
  // exclude
  return {
    ...row,
    updatedAt: now,
    status: 'excluded',
    category: null,
    groupName: null,
    detailName: null,
  };
}

/** issue status = 'resolved' */
export function updateIssueStatusInTx(tx, issueId, setAbortReason) {
  const store = tx.objectStore('menu_sales_issues');
  const getReq = store.get(issueId);
  getReq.onsuccess = () => {
    const issue = getReq.result;
    if (!issue) {
      setAbortReason({
        code: 'ISSUE_RECHECK_NOT_FOUND',
        message: '이슈를 다시 확인할 수 없습니다.',
      });
      tx.abort();
      return;
    }
    const putReq = store.put({
      ...issue,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    putReq.onerror = () => {
      setAbortReason({
        code: 'ISSUE_UPDATE_FAILED',
        message: '이슈 상태 변경 중 오류가 발생했습니다.',
      });
      tx.abort();
    };
  };
  getReq.onerror = () => {
    setAbortReason({
      code: 'ISSUE_RECHECK_FAILED',
      message: '이슈 재조회 중 오류가 발생했습니다.',
    });
    tx.abort();
  };
}
