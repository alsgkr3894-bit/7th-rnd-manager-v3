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
  test.each([
    ['OPT-EDGE-001', '석쇠도우'],
    ['OPT-EDGE-002', '치즈크러스트'],
    ['OPT-EDGE-003', '골드스윗 크러스트'],
    ['OPT-EDGE-004', '씬바사삭'],
  ])('%s(%s)가 카탈로그에 있다', (menuCode, menuName) => {
    const entryPattern = new RegExp(
      `menuCode:\\s*'${menuCode}'[\\s\\S]{0,120}?menuName:\\s*'${menuName}'`
    );
    expect(seedSrc).toMatch(entryPattern);
  });

  test('엣지 4종은 모두 category가 엣지·도우옵션이다', () => {
    const edgeBlockMatch = seedSrc.match(/\/\/ ── 엣지\/도우 옵션[\s\S]*?\];/);
    expect(edgeBlockMatch).not.toBeNull();
    const block = edgeBlockMatch[0];
    expect(block.match(/menuCode: 'OPT-EDGE-\d+'/g) || []).toHaveLength(4);
    expect(block.match(/category: '엣지'/g) || []).toHaveLength(4);
    expect(block.match(/subCategory: '도우옵션'/g) || []).toHaveLength(4);
  });
});
