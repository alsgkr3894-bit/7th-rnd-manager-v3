import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = readFileSync(resolve('scripts/full-rt.mjs'), 'utf8');

function directEntryBlockOf(source) {
  const start = source.indexOf('if (directEntry) {');
  const end = source.indexOf('page.on(', start);
  return source.slice(start, end);
}

describe('full-rt 직접 진입 QA 스크립트', () => {
  test('비-main 직접 진입은 홈 방문 없이 localStorage를 미리 주입한다', () => {
    const block = directEntryBlockOf(script);

    expect(block).toContain('ctx.addInitScript');
    expect(block).toContain("localStorage.setItem(key, val)");
    expect(block).toContain('p2.goto(`${BASE}${route}`');
    expect(block).not.toContain("p2.goto(`${BASE}/`");
  });

  test('주요 모듈 라우트가 회귀 검사 대상에 포함된다', () => {
    const expectedRoutes = [
      '/menu-sales/upload',
      '/menu-sales/unmatched',
      '/jette/shipment',
      '/cost/manage',
      '/nutrition/menu',
      '/nutrition/export',
      '/report/price',
      '/report/shipment',
      '/settings/system',
      '/settings/account',
    ];

    for (const route of expectedRoutes) {
      expect(script).toContain(`'${route}'`);
    }
  });
});
