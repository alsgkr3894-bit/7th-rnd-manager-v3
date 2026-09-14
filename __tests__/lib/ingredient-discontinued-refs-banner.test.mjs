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
    expect(page).toContain('useDiscontinuedRefs');
    expect(page).toContain('onLinkSubstitute={');
    expect(page).toContain('setSubstituteSource');
  });

  test('useDiscontinuedRefs 훅은 단종/숨김 행이 없으면 레시피 스토어를 읽지 않는다', () => {
    const hook = src('app/ingredient/manage/useDiscontinuedRefs.js');
    expect(hook).toContain('export function useDiscontinuedRefs');
    expect(hook).toContain('hasFlaggedRow');
    expect(hook).not.toContain('catch {}');
  });
});
