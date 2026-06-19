import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve('lib/sales/export-xlsx.js'), 'utf-8');

describe('sales export-xlsx 비중(%) 출력 (R2-H2 회귀)', () => {
  // share는 0~1 분수(category.js)이므로 백분율 컬럼은 ×100 해야 한다.
  // 버그: Math.round(share*100)/100 → 0.25 (분수 그대로). 수정: ×1000/10 → 25.0
  test('카테고리 비중을 백분율(0~100)로 변환해 출력한다', () => {
    expect(src).toContain('Math.round((c.share ?? 0) * 1000) / 10');
    expect(src).not.toContain('Math.round((c.share ?? 0) * 100) / 100');
  });

  test('비중(%) 헤더와 전체 합계 100 행이 백분율 기준으로 일관된다', () => {
    expect(src).toContain("'비중(%)'");
    expect(src).toContain("['전체 합계', detail.total, 100]");
  });
});
