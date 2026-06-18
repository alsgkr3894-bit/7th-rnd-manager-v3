import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildMenuMasterCsv } from '../../app/menu-master/menuMasterExport.js';

const pageSource = readFileSync(resolve('app/menu-master/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/menu-master/useMenuMasterActions.js'), 'utf8');
const exportSource = readFileSync(resolve('app/menu-master/menuMasterExport.js'), 'utf8');

describe('menu-master page structure', () => {
  test('page delegates CSV assembly to menuMasterExport', () => {
    expect(pageSource).not.toMatch(/headers.*메뉴코드/s);
    expect(pageSource).toContain('buildMenuMasterCsv');
    expect(exportSource).toContain('메뉴코드');
    expect(exportSource).toContain('export function buildMenuMasterCsv');
  });

  test('page delegates actions to useMenuMasterActions', () => {
    expect(pageSource).toContain('useMenuMasterActions');
    expect(pageSource).not.toContain('pushMasterToPrices');
    expect(pageSource).not.toContain('seedMenuMaster');
    expect(pageSource).not.toContain('deleteMenuMaster');
    expect(pageSource).not.toContain('upsertMenuMaster');
    expect(pageSource).not.toContain('resetAllMenuMaster');
  });

  test('useMenuMasterActions exports key handlers', () => {
    expect(actionsSource).toContain('export function useMenuMasterActions');
    expect(actionsSource).toContain('handleDeleteRow');
    expect(actionsSource).toContain('handleSaveRow');
    expect(actionsSource).toContain('handleSeed');
    expect(actionsSource).toContain('handleResetAndSeed');
    expect(actionsSource).toContain('openDeleteDialog');
  });

  test('buildMenuMasterCsv produces correct CSV', () => {
    const rows = [
      {
        menuCode: 'M001',
        menuName: '마르게리타',
        size: 'L',
        price: 18000,
        status: 'active',
        category: '피자',
      },
      {
        menuCode: 'M002',
        menuName: '콤비네이션, 특선',
        size: 'R',
        price: null,
        status: 'discontinued',
        category: '',
      },
    ];
    const csv = buildMenuMasterCsv(rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"메뉴코드","메뉴명","규격","판매가","상태","카테고리"');
    expect(lines[1]).toBe('"M001","마르게리타","L","18000","active","피자"');
    // 쉼표 포함 이름은 따옴표로 감싸져야 함
    expect(lines[2]).toContain('"콤비네이션, 특선"');
    // null 가격은 빈 문자열
    expect(lines[2]).toContain('""');
  });
});
