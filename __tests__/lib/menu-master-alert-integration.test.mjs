import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = path => readFileSync(resolve(path), 'utf8');

describe('메뉴마스터 이슈 배지·알림 연결', () => {
  test('이슈 탭 배지는 실제 이슈 목록과 같은 집계를 사용한다', () => {
    const source = readSource('app/menu-master/page.jsx');

    expect(source).toContain('buildRecipeIssues(rows, recipeSummaryMap).length');
    expect(source).toContain('이슈{menuIssueCount > 0');
  });

  test('공통 통계 훅이 메뉴마스터 이슈를 계산해 반환한다', () => {
    const source = readSource('hooks/usePageStats.js');

    expect(source).toContain('buildRecipeIssues(menuRows, recipeSummaryMap).length');
    expect(source).toContain(
      'return { unmatchedCount, menuMasterIssueCount, ingredientIssueCount, ingredientIssueFailed }'
    );
  });

  test('상단 알림에 메뉴마스터 이슈와 이동 경로가 표시된다', () => {
    const source = readSource('components/TopBar.jsx');

    expect(source).toContain('메뉴마스터 이슈 ${menuMasterIssueCount}건 확인 필요');
    expect(source).toContain("href: '/menu-master'");
  });

  test('상단 알림에 식자재관리 이슈와 이슈 탭 이동 경로가 표시된다', () => {
    const topBarSource = readSource('components/TopBar.jsx');
    const statsSource = readSource('hooks/usePageStats.js');

    expect(statsSource).toContain('getIngredientIssueCount()');
    expect(topBarSource).toContain('식자재관리 이슈 ${ingredientIssueCount}건 확인 필요');
    expect(topBarSource).toContain("href: '/ingredient/manage?view=issues'");
  });

  test('식자재 이슈 화면에서 전용·범용 미지정만 필터링할 수 있다', () => {
    const source = readSource('components/ingredient/IssuesView.jsx');

    expect(source).toContain("'no-scope': safeIssueRows.filter");
    expect(source).toContain("{ id: 'no-scope', label: '전용/범용 미지정'");
  });
});
