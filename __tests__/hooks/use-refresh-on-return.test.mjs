import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { isRefreshDue } from '../../hooks/useRefreshOnReturn.js';

// 2026-10-12: 계산 화면에서 값을 입력한 뒤 열어 둔 표 출력(통합 포스터)으로 돌아오면
// 예전 값이 그대로 보이던 문제 — 출력 화면이 열릴 때 한 번만 값을 읽었다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('isRefreshDue — 연달아 오는 이벤트는 한 번만', () => {
  test('처음이거나 충분히 지났으면 새로 읽는다', () => {
    expect(isRefreshDue(0, 100000)).toBe(true);
    expect(isRefreshDue(1000, 3000)).toBe(true);
    expect(isRefreshDue(1000, 2500)).toBe(true);
  });

  test('직전에 읽었으면(탭 전환으로 visibilitychange·focus가 연달아 올 때) 건너뛴다', () => {
    expect(isRefreshDue(1000, 1200)).toBe(false);
    expect(isRefreshDue(1000, 2499)).toBe(false);
    expect(isRefreshDue(1000, 1200, 100)).toBe(true);
  });
});

describe('표 출력(영양성분표) 화면 연결', () => {
  test('돌아올 때(탭 활성화·창 포커스·뒤로가기 복원) 다시 읽는 훅을 쓴다', () => {
    const hook = read('hooks/useRefreshOnReturn.js');
    expect(hook).toContain("document.addEventListener('visibilitychange', onVisibility)");
    expect(hook).toContain("window.addEventListener('focus', run)");
    expect(hook).toContain("window.addEventListener('pageshow', onPageShow)");
    expect(hook).toContain('if (event.persisted) run();');
  });

  test('NutritionLabelResult는 reloadTick이 바뀌면 값을 다시 불러온다(화면 상태는 유지)', () => {
    const page = read('app/nutrition/export/NutritionLabelResult.jsx');
    expect(page).toContain("import { useRefreshOnReturn } from '@/hooks/useRefreshOnReturn';");
    expect(page).toContain('useRefreshOnReturn(() => setReloadTick(tick => tick + 1));');
    expect(page).toMatch(/beverageOrder,\s*reloadTick,\s*\]\);/);
    // 다시 읽을 때 로딩 화면으로 되돌리지 않는다 — setLoading(true)는 초기 상태뿐
    expect(page).not.toContain('setLoading(true)');
  });
});
