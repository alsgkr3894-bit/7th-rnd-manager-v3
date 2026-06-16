import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const shellSource = readFileSync(resolve('components/AppShell.jsx'), 'utf8');
const brandsHookSource = readFileSync(resolve('hooks/useAppBrands.js'), 'utf8');

describe('AppShell hydration guards', () => {
  test('브랜드 상태 초기값은 localStorage 기반 helper를 직접 호출하지 않는다', () => {
    expect(brandsHookSource).not.toMatch(/useState\(\(\)\s*=>\s*get(?:ActiveBrand|VisibleBrands)\(/);
    expect(brandsHookSource).toContain('useState(SSR_BRAND_OPTIONS)');
    expect(brandsHookSource).toContain('useState(SSR_ACTIVE_COMPANY)');
    expect(shellSource).toContain('useAppBrands');
  });
});
