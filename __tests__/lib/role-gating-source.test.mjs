import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

function sourceOf(file) {
  return readFileSync(resolve(file), 'utf8');
}

describe('role gating source guards', () => {
  test('브랜드마스터와 엣지 영양 저장은 활성 계정 역할 기준을 사용한다', () => {
    const brandSource = sourceOf('app/settings/brands/page.jsx');
    const edgeSource = sourceOf('components/nutrition/menu/TabEdge.jsx');
    const salesSettingsSource = sourceOf('app/menu-sales/settings/page.jsx');
    const aliasSectionSource = sourceOf('components/sales/UserAliasesSection.jsx');
    const excludedSectionSource = sourceOf('components/sales/UserExcludedSection.jsx');

    expect(brandSource).toContain("from '@/hooks/useCurrentRole'");
    expect(edgeSource).toContain("from '@/hooks/useCurrentRole'");
    expect(salesSettingsSource).toContain("from '@/hooks/useCurrentRole'");
    expect(salesSettingsSource).toContain('canEdit={canEdit}');
    expect(aliasSectionSource).toContain('disabled={!canEdit}');
    expect(excludedSectionSource).toContain('disabled={!canEdit}');
    expect(brandSource).not.toContain('isAdminProfile');
    expect(edgeSource).not.toContain('isAdminProfile');
  });

  test('브랜드마스터 lib는 legacy profile 관리자 판정 wrapper를 노출하지 않는다', () => {
    const brandMasterSource = sourceOf('lib/brand-master.js');

    expect(brandMasterSource).not.toContain("from '@/lib/profile'");
    expect(brandMasterSource).not.toContain('isAdminProfile');
  });

  test('활성 역할 로드 전에는 조회자 상태로 시작한다', () => {
    const hookSource = sourceOf('hooks/useCurrentRole.js');

    expect(hookSource).toContain("useState('viewer')");
    expect(hookSource).toContain('ready');
    expect(hookSource).toContain("setRole('viewer')");
  });

  test('활성 역할 비동기 로드는 unmount와 오래된 요청을 무시한다', () => {
    const hookSource = sourceOf('hooks/useCurrentRole.js');

    expect(hookSource).toContain('mountedRef');
    expect(hookSource).toContain('refreshSeqRef');
    expect(hookSource).toContain('const seq = ++refreshSeqRef.current');
    expect(hookSource).toContain('!mountedRef.current || seq !== refreshSeqRef.current');
    expect(hookSource).toContain('mountedRef.current = false');
    expect(hookSource).toContain('refreshSeqRef.current += 1');
  });

  test('엣지 영양 화면은 베이스 입력 상태와 베이스 탭 이동을 노출한다', () => {
    const pageSource = sourceOf('app/nutrition/menu/page.jsx');
    const workspaceSource = sourceOf('app/nutrition/menu/NutritionMenuWorkspace.jsx');
    const edgeSource = sourceOf('components/nutrition/menu/TabEdge.jsx');

    expect(pageSource).toContain('rawMap={rawMap}');
    expect(pageSource).toContain('menus={menus}');
    expect(workspaceSource).toContain('onOpenBase={() => onTab(0)}');
    expect(edgeSource).toContain('baseStatusOf');
    expect(edgeSource).toContain('베이스 영양성분 열기');
  });
});
