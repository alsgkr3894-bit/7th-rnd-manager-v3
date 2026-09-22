import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

/**
 * 메뉴마스터 편집창의 "레시피/원가" 섹션이 엣지 카테고리에서 일반 "이 카테고리는 레시피
 * 원가를 지원하지 않습니다"만 보여줘 오해를 사던 것을, summarizeMenuEdge 기반 실제 원가
 * 요약 + 공통 원가 관리 링크로 바꿨는지 확인한다(MenuRecipeCostCell과 같은 데이터 소스).
 */
const sectionSrc = readFileSync(resolve('components/menu-master/MenuRecipeSection.jsx'), 'utf8');
const noticeSrc = readFileSync(
  resolve('components/menu-master/recipe/MenuRecipeEdgeNotice.jsx'),
  'utf8'
);
const fieldsSrc = readFileSync(resolve('components/menu-master/MenuMasterEditFields.jsx'), 'utf8');
const barrelSrc = readFileSync(resolve('components/menu-master/recipe/index.js'), 'utf8');

describe('MenuRecipeSection — 엣지 카테고리 안내', () => {
  test('엣지로 판정되면 일반 가드 문구 대신 MenuRecipeEdgeNotice를 렌더한다', () => {
    expect(sectionSrc).toContain(
      "import { resolveMenuEdgeFamily } from '@/lib/menu-master/edge-family';"
    );
    expect(sectionSrc).toContain('MenuRecipeEdgeNotice');
    expect(sectionSrc).toContain('resolveMenuEdgeFamily({ category, menuName, edgeKey })');
  });

  test('edgeKey prop을 받아 명시적 링크(자동 판정 오버라이드)를 반영한다', () => {
    expect(sectionSrc).toContain('edgeKey,');
  });
});

describe('MenuMasterEditFields — edgeKey를 레시피 섹션까지 전달한다', () => {
  test('form.edgeKey를 MenuRecipeSection에 전달한다', () => {
    expect(fieldsSrc).toContain('edgeKey={form.edgeKey}');
  });
});

describe('MenuRecipeEdgeNotice — 실제 엣지 원가 데이터 사용', () => {
  test('summarizeMenuEdge와 getAllEdges(cost_edge_dough)로 원가를 계산한다', () => {
    expect(noticeSrc).toContain("import { getAllEdges } from '@/lib/cost/edge-dough';");
    expect(noticeSrc).toContain(
      "import { loadLatestUnitPriceMap, summarizeMenuEdge } from '@/lib/menu-master/recipe-summary';"
    );
  });

  // 2026-09-22: 엣지 원가가 저장된 단가에만 의존해 최신 제때 단가를 반영하지 않던 문제 수정 —
  // 이 안내도 메뉴마스터 요약·원가보고서와 같은 unitPriceMap을 넘겨 최신 값을 보여준다.
  test('최신 제때 단가(unitPriceMap)를 함께 불러와 summarizeMenuEdge에 넘긴다', () => {
    expect(noticeSrc).toContain('loadLatestUnitPriceMap()');
    expect(noticeSrc).toContain('summarizeMenuEdge(menu, edges, unitPriceMap)');
  });

  test('원가 구성 수정은 공통 원가 관리(/cost/recipe)로 안내한다', () => {
    expect(noticeSrc).toContain('/cost/recipe');
  });

  test('barrel(components/menu-master/recipe/index.js)에서 export된다', () => {
    expect(barrelSrc).toContain("export { MenuRecipeEdgeNotice } from './MenuRecipeEdgeNotice';");
  });
});
