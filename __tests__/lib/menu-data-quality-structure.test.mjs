import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/menu-master/page.jsx'), 'utf8');
const panelSource = readFileSync(
  resolve('components/menu-master/MenuDataQualityPanel.jsx'),
  'utf8'
);

describe('menu data quality UI structure', () => {
  test('menu master page exposes quality diagnostics beside readiness', () => {
    expect(pageSource).toContain('MenuReadinessPanel');
    expect(pageSource).toContain('MenuDataQualityPanel');
    expect(pageSource).toContain("viewMode !== 'readiness' && viewMode !== 'quality'");
    expect(pageSource).toContain("setViewMode('quality')");
    expect(pageSource).toContain('품질 점검');
  });

  test('quality panel covers duplicate, price, recipe, nutrition, origin, and allergen diagnostics', () => {
    expect(panelSource).toContain('buildMenuDataQualityReport');
    expect(panelSource).toContain('QUALITY_KIND_ORDER');
    expect(panelSource).toContain('메뉴·진단 검색');
    expect(panelSource).toContain('조건에 맞는 진단 항목이 없습니다');
  });
});
