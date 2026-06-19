import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const libSrc = readFileSync(resolve('lib/report/export-cost-xlsx.js'), 'utf-8');
const pageSrc = readFileSync(resolve('app/report/cost/page.jsx'), 'utf-8');

describe('export-cost-xlsx 분리 구조', () => {
  test('lib/report/export-cost-xlsx.js에 exportCostXlsx 함수가 있다', () => {
    expect(libSrc).toContain('export async function exportCostXlsx');
  });

  test('lib 파일이 3개 시트를 생성한다', () => {
    expect(libSrc).toContain('카테고리 요약');
    expect(libSrc).toContain('메뉴 상세');
    expect(libSrc).toContain('레시피 출력');
  });

  test('lib 파일이 getMenuCodeRank로 메뉴코드 정렬을 한다', () => {
    expect(libSrc).toContain('getMenuCodeRank');
  });

  test('page.jsx는 exportCostXlsx를 lib에서 import한다', () => {
    expect(pageSrc).toContain("from '@/lib/report/export-cost-xlsx'");
    expect(pageSrc).toContain('exportCostXlsx');
  });

  test('page.jsx는 loadXlsx와 withDownloadDateSuffix를 직접 import하지 않는다', () => {
    expect(pageSrc).not.toContain("from '@/lib/excel'");
    expect(pageSrc).not.toContain("from '@/lib/download'");
  });

  test('page.jsx는 getMenuCodeRank를 직접 import하지 않는다', () => {
    expect(pageSrc).not.toContain('getMenuCodeRank');
  });

  // R2-H3 회귀: 위험 메뉴 카운트가 riskThreshold 임계값을 사용한다 (rate>0 전수 카운트 아님)
  test('exportCostXlsx가 riskThreshold 인자를 받고 위험메뉴를 임계값으로 카운트한다', () => {
    expect(libSrc).toContain('riskThreshold');
    expect(libSrc).toContain('m.rate >= riskThreshold');
    expect(libSrc).not.toContain('c.menus.filter(m => m.rate > 0).length');
  });

  test('page.jsx가 exportCostXlsx에 riskThreshold를 전달한다', () => {
    expect(pageSrc).toContain('exportCostXlsx(periodLabel, activeCats, recipeRows, riskThreshold)');
  });
});
