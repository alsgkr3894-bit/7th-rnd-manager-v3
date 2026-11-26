import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { formatRow, median, summarizeRuns } from '../../scripts/perf-app-baseline-core.mjs';

// 2026-11-26 점검 0단계 4·5번: 속도·조회 횟수·메모리 기준과 시작 상태 점검.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('속도 기준 계산', () => {
  test('가운데 값', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20])).toBe(15);
    expect(median([])).toBeNull();
  });

  test('반복해 읽는 저장소와 대표 시간을 낸다', () => {
    const summary = summarizeRuns([
      { ms: 900, heapMb: 50, getAll: { cost_ingredients: 4, menu_master: 1 } },
      { ms: 700, heapMb: 52, getAll: { cost_ingredients: 4, menu_master: 1, once: 3 } },
      { ms: 800, heapMb: 51, getAll: { cost_ingredients: 6, menu_master: 1 } },
    ]);
    expect(summary).toMatchObject({ ms: 800, heapMb: 51, repeatedStores: { cost_ingredients: 4 } });
    expect(summary.repeatedStores.once).toBeUndefined();
    expect(formatRow('홈', summary, 500)).toContain('(목표 500ms 초과)');
  });
});

describe('안전한 측정 환경', () => {
  const script = read('scripts/perf-app-baseline.mjs');

  test('복원한 임시 DB에 쓰기 거부 상태로 띄우고 정리한다', () => {
    expect(script).toContain("'--keep', '--env-out'");
    expect(script).toContain('DATABASE_URL: url');
    expect(script).toContain("RND_SANDBOX_REJECT_WRITES: '1'");
    expect(script).toContain("'--cleanup', envFile");
  });

  test('표 화면은 로딩 자리표시자(5행)보다 많은 데이터 행이 보여야 준비로 본다', () => {
    expect(script.match(/rows: 20/g)).toHaveLength(4);
    expect(script).toContain('로딩 중|불러오는 중');
  });

  test('스모크 QA는 서버 로그인을 하고, 로그인 화면이면 실패시킨다', () => {
    expect(read('scripts/qa-browser-utils.mjs')).toContain('process.env.QA_PASSWORD');
    expect(read('scripts/qa-viewport-runner.mjs')).toContain('로그인 화면으로 이동했습니다');
  });
});
