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
});
