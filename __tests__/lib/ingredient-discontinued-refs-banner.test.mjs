import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

describe('단종 식자재 참조 진단 배너 배선', () => {
  test('배너 컴포넌트가 info-banner + 대체 연결 버튼을 갖는다', () => {
    const banner = src('app/ingredient/manage/diagnostics/DiscontinuedRefsBanner.jsx');
    expect(banner).toContain('export function DiscontinuedRefsBanner');
    expect(banner).toContain('info-banner');
    expect(banner).toContain('대체 연결');
    expect(banner).toContain('onLinkSubstitute');
  });

  test('diagnostics 배럴과 IngredientDiagnostics가 배너를 내보내고 렌더한다', () => {
    const barrel = src('app/ingredient/manage/diagnostics/index.js');
    expect(barrel).toContain("export { DiscontinuedRefsBanner } from './DiscontinuedRefsBanner'");

    const diagnostics = src('app/ingredient/manage/IngredientDiagnostics.jsx');
    expect(diagnostics).toContain('<DiscontinuedRefsBanner');
    expect(diagnostics).toContain('discontinuedRefs');
  });

  test('page가 useDiscontinuedRefs를 로드해 배너에 연결하고 기존 SubstituteLinkModal을 재사용한다', () => {
    const page = src('app/ingredient/manage/page.jsx');
    expect(page).toContain('onLinkSubstitute={');
    // useDiscontinuedRefs 호출·substituteSource 상태는 조립 훅(useIngredientManagePage)으로 이동됨
    const pageHook = src('app/ingredient/manage/useIngredientManagePage.js');
    expect(pageHook).toContain('useDiscontinuedRefs');
    expect(pageHook).toContain('setSubstituteSource');
  });

  test('useDiscontinuedRefs 훅은 단종/숨김 행이 없으면 레시피 스토어를 읽지 않는다', () => {
    const hook = src('app/ingredient/manage/useDiscontinuedRefs.js');
    expect(hook).toContain('export function useDiscontinuedRefs');
    expect(hook).toContain('flaggedKey');
    expect(hook).not.toContain('catch {}');
  });

  test('useDiscontinuedRefs는 rows 참조 변화가 아니라 단종/숨김 productCode 집합 변화에만 재조회한다', () => {
    const hook = src('app/ingredient/manage/useDiscontinuedRefs.js');
    // 무관한 rows 갱신마다 재조회하던 성능 회귀 방지 — effect deps에서 rows를 제거하고
    // flaggedKey(짧은 요약 문자열) + refreshKey로만 재실행한다.
    expect(hook).toContain('}, [flaggedKey, refreshKey]);');
    expect(hook).not.toContain('}, [rows, hasFlaggedRow, refreshKey]);');
  });
});
