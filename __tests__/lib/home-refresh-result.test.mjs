import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { refreshToast, summarizeRefresh } from '../../lib/home/refresh-summary.js';

// 2026-11-26 점검 목록 6번: 새로고침 버튼도 선택한 월의 판매 통계를 읽고, 실패를 성공으로 안내하지 않는다.
const read = p =>
  readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const ok = { status: 'fulfilled', value: 1 };
const bad = { status: 'rejected', reason: new Error('x') };

describe('새로고침 결과 판정', () => {
  test('모두 성공해야 완료 안내가 나온다', () => {
    expect(refreshToast(summarizeRefresh([ok, ok], [ok]))).toMatchObject({ type: 'ok' });
  });

  test('선택 기간의 판매 통계 하나만 실패해도 부분 갱신으로 안내한다', () => {
    const summary = summarizeRefresh([ok, ok], [ok, bad]);
    expect(summary).toEqual({ status: 'partial', failed: 1, total: 4 });
    expect(refreshToast(summary).type).toBe('warn');
    expect(refreshToast(summary).message).toContain('1개');
  });

  test('전부 실패하면 실패, 로더가 이미 알린 오류면 추가 안내가 없다', () => {
    expect(refreshToast(summarizeRefresh([bad, bad])).type).toBe('error');
    expect(refreshToast({ status: 'error' })).toBeNull();
  });
});

describe('홈 연결', () => {
  const hook = read('hooks/useHomeDashboardData.js');
  const page = read('app/page.jsx');

  test('버튼과 탭 복귀가 같은 refreshDashboard를 쓴다', () => {
    expect(hook).toContain('useVisibilityRefresh(refreshDashboard)');
    expect(hook).toContain('const sales = await fetchSalesForAnchor(anchor, () => true);');
    expect(page).toContain('refreshToast(await refreshDashboard())');
    expect(page).not.toContain('await loadData()');
  });

  test('늦게 끝난 이전 기간의 결과는 반영하지 않는다', () => {
    expect(hook).toContain('anchorRef.current !== a');
  });
});
