import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-09-29 성능 점검: 프로덕션 홈의 CLS가 데스크톱 0.117·모바일 0.628이었다.
// 원인은 1차·2차 조회가 도착할 때마다 위젯이 하나씩 끼어들어 아래를 밀어낸 것이고,
// 카운트업이 페이지 최상위에서 프레임마다 상태를 바꿔 홈 전체를 다시 그린 것이다.
const read = p =>
  readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
    .split('\r\n')
    .join('\n');

describe('홈 대시보드 레이아웃 시프트 방지', () => {
  const page = read('app/page.jsx');
  const hook = read('hooks/useHomeDashboardData.js');

  test('훅은 조회가 끝나면(실패해도) initialLoaded를 true로 만든다', () => {
    expect(hook).toContain('const [initialLoaded, setInitialLoaded] = useState(false)');
    const finallyAt = hook.indexOf('} finally {');
    expect(finallyAt).toBeGreaterThan(-1);
    expect(hook.slice(finallyAt, finallyAt + 200)).toContain('setInitialLoaded(true)');
    expect(hook).toMatch(/\n {4}initialLoaded,\n/);
  });

  test('페이지는 initialLoaded 전에는 위젯 대신 고정 높이 자리표시자를 그린다', () => {
    expect(page).toContain('initialLoaded ? (');
    expect(page).toContain('<HomeDashboardSkeleton />');
    // 위젯(ActionCenter·행 목록)은 자리표시자 분기의 참쪽에만 있어야 한다
    const skeletonAt = page.indexOf('<HomeDashboardSkeleton />');
    expect(page.indexOf('<ActionCenterWidget')).toBeLessThan(skeletonAt);
    expect(page.indexOf('<HomeDashboardRows')).toBeLessThan(skeletonAt);
    expect(page.indexOf('initialLoaded ? (')).toBeLessThan(page.indexOf('<ActionCenterWidget'));
  });

  test('인사말 부제는 데이터 도착 전에도 한 줄 높이를 유지한다', () => {
    expect(page).toContain('greetSub={initialLoaded ? greetSub : null}');
    expect(read('components/home/HomeGreetingBar.jsx')).toContain("greetSub ?? '\u00a0'");
  });

  test('자리표시자는 애니메이션 없이 고정 높이를 가진다', () => {
    const css = read('app/styles/components/home-hero.css');
    const at = css.indexOf('.home-skeleton {');
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf('}', at));
    expect(block).toMatch(/min-height:\s*\d+px/);
    expect(css.slice(at)).not.toMatch(/\.home-skeleton[^{]*\{[^}]*animation/);
  });
});

describe('카운트업은 숫자 한 조각에서만 상태를 바꾼다', () => {
  test('홈 페이지 최상위는 useCountUp을 부르지 않는다', () => {
    const page = read('app/page.jsx');
    expect(page).not.toContain('useCountUp');
    expect(page).not.toContain('salesCount');
    expect(page).not.toContain('noteCount');
  });

  test('KPI·도넛은 <CountUp>으로 숫자를 그린다', () => {
    const kpi = read('components/home/HomeKpiRow.jsx');
    expect(kpi).toContain('<CountUp value={safeSalesCount}');
    expect(kpi).toContain('<CountUp value={safeNoteCount}');
    expect(kpi).not.toContain('useCountUp');
    const chart = read('components/home/HomeChartRow.jsx');
    expect(chart).toContain('<CountUp value={donut?.total ?? 0}');
    expect(chart).not.toContain('useCountUp');
  });

  test('모션 줄이기 설정이면 애니메이션 없이 최종값을 보여 준다', () => {
    const src = read('hooks/useCountUp.js');
    expect(src).toContain('prefers-reduced-motion: reduce');
    const effectAt = src.indexOf('useEffect(() => {');
    expect(src.slice(effectAt, effectAt + 160)).toContain('prefersReducedMotion()');
  });
});
