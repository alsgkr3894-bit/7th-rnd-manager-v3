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

    expect(brandSource).toContain("from '@/hooks/useCurrentRole'");
    expect(edgeSource).toContain("from '@/hooks/useCurrentRole'");
    expect(brandSource).not.toContain('isAdminProfile');
    expect(edgeSource).not.toContain('isAdminProfile');
  });

  test('활성 역할 로드 전에는 조회자 상태로 시작한다', () => {
    const hookSource = sourceOf('hooks/useCurrentRole.js');

    expect(hookSource).toContain("useState('viewer')");
    expect(hookSource).toContain('ready');
    expect(hookSource).toContain("setRole('viewer')");
  });

  test('엣지 영양 화면은 베이스 입력 상태와 베이스 탭 이동을 노출한다', () => {
    const pageSource = sourceOf('app/nutrition/menu/page.jsx');
    const edgeSource = sourceOf('components/nutrition/menu/TabEdge.jsx');

    expect(pageSource).toContain('rawMap={rawMap}');
    expect(pageSource).toContain('menus={menus}');
    expect(pageSource).toContain('onOpenBase={() => setTab(0)}');
    expect(edgeSource).toContain('baseStatusOf');
    expect(edgeSource).toContain('베이스 영양성분 열기');
  });
});
