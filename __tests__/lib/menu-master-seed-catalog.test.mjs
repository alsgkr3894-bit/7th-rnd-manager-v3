import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from '@jest/globals';

const seedSrc = readFileSync(resolve('lib/menu-master/seed.js'), 'utf8');

/**
 * 기본 코드 카탈로그(SEED_ENTRIES)의 엣지/도우 옵션 4종이 실데이터와 일치하는지 확인.
 * 씬바사삭(OPT-EDGE-004)은 실서버엔 이미 있었지만 이 카탈로그에는 빠져 있어, "기본 코드
 * 등록"으로 새로 세팅하는 브랜드/설치에는 엣지 4종 중 1개가 누락돼 있었다.
 */
describe('menu-master seed catalog — 엣지/도우 옵션 4종', () => {
  // 치즈크러스트·골드스윗은 2026-09-22부터 추가 요금이 사이즈별(L 5,000 / R 4,000)이라 L/R 두 행.
  test.each([
    ['OPT-EDGE-001', '석쇠도우'],
    ['OPT-EDGE-002-L', '치즈크러스트 L'],
    ['OPT-EDGE-002-R', '치즈크러스트 R'],
    ['OPT-EDGE-003-L', '골드스윗 크러스트 L'],
    ['OPT-EDGE-003-R', '골드스윗 크러스트 R'],
    ['OPT-EDGE-004', '씬바사삭'],
  ])('%s(%s)가 카탈로그에 있다', (menuCode, menuName) => {
    const entryPattern = new RegExp(
      `menuCode:\\s*'${menuCode}'[\\s\\S]{0,120}?menuName:\\s*'${menuName}'`
    );
    expect(seedSrc).toMatch(entryPattern);
  });

  test('엣지 6행은 모두 category가 엣지·도우옵션이고 사이즈별 가격이 맞다', () => {
    const edgeBlockMatch = seedSrc.match(/\/\/ ── 엣지\/도우 옵션[\s\S]*?\];/);
    expect(edgeBlockMatch).not.toBeNull();
    const block = edgeBlockMatch[0];
    expect(block.match(/menuCode: 'OPT-EDGE-\d+(?:-[LR])?'/g) || []).toHaveLength(6);
    expect(block.match(/category: '엣지'/g) || []).toHaveLength(6);
    expect(block.match(/subCategory: '도우옵션'/g) || []).toHaveLength(6);
    expect(block.match(/price: 5000/g) || []).toHaveLength(2);
    expect(block.match(/price: 4000/g) || []).toHaveLength(2);
  });
});
