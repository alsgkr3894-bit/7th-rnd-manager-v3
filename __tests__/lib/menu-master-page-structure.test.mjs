import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildMenuMasterCsvRows } from '../../app/menu-master/menuMasterExport.js';

const pageSource = readFileSync(resolve('app/menu-master/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/menu-master/useMenuMasterActions.js'), 'utf8');
const exportSource = readFileSync(resolve('app/menu-master/menuMasterExport.js'), 'utf8');
const editModalSource = readFileSync(
  resolve('components/menu-master/MenuMasterEditModal.jsx'),
  'utf8'
);
const editFieldsSource = readFileSync(
  resolve('components/menu-master/MenuMasterEditFields.jsx'),
  'utf8'
);
const recipeSectionSource = readFileSync(
  resolve('components/menu-master/MenuRecipeSection.jsx'),
  'utf8'
);
const recipeHeaderSource = readFileSync(
  resolve('components/menu-master/MenuRecipeSectionHeader.jsx'),
  'utf8'
);

describe('menu-master page structure', () => {
  test('page delegates CSV assembly to menuMasterExport', () => {
    expect(pageSource).not.toMatch(/headers.*메뉴코드/s);
    expect(pageSource).toContain('exportMenuMasterCsv');
    expect(exportSource).toContain('메뉴코드');
    expect(exportSource).toContain('export function exportMenuMasterCsv');
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
    expect(pageSource).toContain('canEdit: !isViewer');
    expect(actionsSource).toContain('canEdit = false');
    expect(actionsSource).toContain('function requireEdit()');
    expect(actionsSource).toContain("showToast('관리자 권한이 필요합니다', 'error')");
    expect(actionsSource).toContain('if (!requireEdit()) return');
    expect(actionsSource).toContain('handleDeleteRow');
    expect(actionsSource).toContain('handleSaveRow');
    expect(actionsSource).toContain('handleSeed');
    expect(actionsSource).toContain('handleResetAndSeed');
    expect(actionsSource).toContain('openDeleteDialog');
  });

  test('수정 모달 상단 저장이 메뉴 기본정보와 레시피 저장을 함께 호출한다', () => {
    expect(editModalSource).toContain('recipeSectionRef');
    expect(editModalSource).toContain('recipeSectionRef.current?.saveRecipe');
    expect(editModalSource).toContain('closeModal: false');
    expect(editModalSource).toContain('reloadAfter: false');
    expect(editModalSource).toContain('throwOnError: true');
    expect(editFieldsSource).toContain('ref={recipeSectionRef}');
    expect(recipeSectionSource).toContain('useImperativeHandle');
    expect(recipeSectionSource).toContain('saveRecipe: handleSave');
  });

  test('레시피 섹션에는 별도 레시피 저장 버튼을 노출하지 않는다', () => {
    expect(recipeHeaderSource).not.toContain('레시피 저장');
    expect(recipeSectionSource).not.toContain('onSave={handleSave}');
  });

  test('buildMenuMasterCsvRows produces correct 2D array', () => {
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
    const result = buildMenuMasterCsvRows(rows);
    expect(result[0]).toEqual(['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리']);
    expect(result[1]).toEqual(['M001', '마르게리타', 'L', 18000, 'active', '피자']);
    // 쉼표 포함 이름이 그대로 유지돼야 함 (rowsToCsv에서 이스케이프)
    expect(result[2][1]).toBe('콤비네이션, 특선');
    // null 가격은 빈 문자열
    expect(result[2][3]).toBe('');
  });
});
