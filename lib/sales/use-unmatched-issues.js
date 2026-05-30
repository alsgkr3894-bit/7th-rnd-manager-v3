'use client';
import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { getIssues, resolveUnmatchedIssue, bulkExcludeIssues } from './index.js';

/**
 * 미매칭 이슈 목록과 해결·일괄제외 액션을 제공하는 hook.
 * 각 액션 성공 후 자동으로 목록을 갱신한다.
 *
 * @returns {{ ready, issues, resolve, bulkExclude }}
 */
export function useUnmatchedIssues() {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);

  async function refresh() {
    const all = await getIssues();
    setIssues(all);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await refresh();
        setReady(true);
      } catch (err) {
        console.error('[useUnmatchedIssues] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
      }
    })();
  }, []);

  async function resolve(issueId, actionType, actionData) {
    try {
      await resolveUnmatchedIssue(issueId, actionType, actionData);
      showToast('미매칭이 해결됐어요', 'ok');
      await refresh();
    } catch (err) {
      console.error('[useUnmatchedIssues] 해결 실패:', err);
      showToast(err?.message || '해결 처리 실패', 'err');
    }
  }

  async function bulkExclude(ids) {
    try {
      const { resolved, failed } = await bulkExcludeIssues(ids);
      showToast(
        failed.length === 0
          ? `${resolved.length}건 일괄 제외 처리됐어요`
          : `${resolved.length}건 성공 · ${failed.length}건 실패`,
        failed.length === 0 ? 'ok' : 'warn',
      );
      await refresh();
    } catch (err) {
      console.error('[useUnmatchedIssues] 일괄 제외 실패:', err);
      showToast('일괄 처리 실패', 'err');
    }
  }

  return { ready, issues, resolve, bulkExclude };
}
