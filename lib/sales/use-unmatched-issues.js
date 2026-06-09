'use client';
import { useEffect, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { getIssues, resolveUnmatchedIssue, bulkExcludeIssues, bulkResolveRule } from './index.js';

/**
 * 미매칭 이슈 목록과 해결·일괄제외 액션을 제공하는 hook.
 * 각 액션 성공 후 자동으로 목록을 갱신한다.
 *
 * @returns {{ ready, issues, resolve, bulkExclude }}
 */
export function useUnmatchedIssues() {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);
  const mountedRef = useRef(false);

  async function refresh() {
    const all = await getIssues();
    if (!mountedRef.current) return;
    setIssues(all);
  }

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        await initDB();
        if (!mountedRef.current) return;

        await refresh();
        if (!mountedRef.current) return;

        setReady(true);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[useUnmatchedIssues] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function resolve(issueId, actionType, actionData) {
    try {
      await resolveUnmatchedIssue(issueId, actionType, actionData);
      if (!mountedRef.current) return;
      showToast('미매칭이 해결됐어요', 'ok');
      await refresh();
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[useUnmatchedIssues] 해결 실패:', err);
      showToast(err?.message || '해결 처리 실패', 'err');
    }
  }

  async function bulkExclude(ids) {
    try {
      const { resolved, failed } = await bulkExcludeIssues(ids);
      if (!mountedRef.current) return;
      showToast(
        failed.length === 0
          ? `${resolved.length}건 일괄 제외 처리됐어요`
          : `${resolved.length}건 성공 · ${failed.length}건 실패`,
        failed.length === 0 ? 'ok' : 'warn',
      );
      await refresh();
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[useUnmatchedIssues] 일괄 제외 실패:', err);
      showToast('일괄 처리 실패', 'err');
    }
  }

  async function bulkRule(ids, ruleData) {
    try {
      const { resolved, failed } = await bulkResolveRule(ids, ruleData);
      if (!mountedRef.current) return;
      showToast(
        failed.length === 0
          ? `${resolved.length}건 분류 일괄 적용됐어요`
          : `${resolved.length}건 성공 · ${failed.length}건 실패`,
        failed.length === 0 ? 'ok' : 'warn',
      );
      await refresh();
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[useUnmatchedIssues] 일괄 분류 실패:', err);
      showToast('일괄 처리 실패', 'err');
    }
  }

  return { ready, issues, resolve, bulkExclude, bulkRule };
}
