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

  // 회귀: 메뉴코드를 바꿔도 저장 전 경고나 이동 결과 안내가 전혀 없었다. 저장 성공 토스트에
  // 캐스케이드 요약을 보여주고, 저장 전 코드 변경/중복 경고를 표시한다.
  test('메뉴코드 변경 시 캐스케이드 요약·중복 경고를 보여준다', () => {
    expect(editModalSource).toContain("from '@/components/menu-master/useMenuCodeConflict'");
    expect(editModalSource).toContain("from '@/lib/menu-master/linked-code-plan'");
    expect(editModalSource).toContain('useMenuCodeConflict(');
    expect(editModalSource).toContain('formatMenuCodeCascadeSummary(');
    expect(editModalSource).toContain('result?.cascadedMenuCode');
    expect(editModalSource).toContain('result?.cascadedIdentity');
    expect(editModalSource).toContain('코드 변경');
    expect(editModalSource).toContain('codeConflict');
    expect(editModalSource).toContain('!codeConflict');
  });

  // 회귀: 메뉴 추가 모달은 저장 후에만 레시피를 입력할 수 있었다(추가 → 수정 재진입).
  // 카테고리만 선택하면 추가 모달에서도 바로 레시피를 입력할 수 있게 하고,
  // 메뉴 저장은 성공했는데 레시피 저장만 실패하면 모달을 유지해 재시도할 수 있게 한다.
  test('추가 모달에서도 카테고리만 있으면 레시피 섹션을 보여준다(draft 모드)', () => {
    expect(editFieldsSource).toContain('(isNew ? form.category : form.menuCode && form.category)');
    expect(editFieldsSource).toContain('draft={isNew}');
    expect(editFieldsSource).toContain('sourceMenuCode={row?.menuCode || form.menuCode}');
  });

  test('메뉴 저장 성공 + 레시피 저장 실패 시 모달을 유지하고 재시도할 수 있게 한다', () => {
    expect(editModalSource).toContain('persistedRow');
    expect(editModalSource).toContain('if (result?.id != null && !persistedRow?.id)');
    expect(editModalSource).toContain('메뉴는 저장됐지만 레시피 저장 실패');
  });

  test('레시피 에디터는 draft 모드에서 편집 중 초기화되지 않는다', () => {
    const editorSource = readFileSync(
      resolve('components/menu-master/useMenuRecipeEditor.js'),
      'utf8'
    );
    expect(editorSource).toContain('draft = false');
    expect(editorSource).toContain('loadedKeyRef');
    expect(editorSource).toContain('loadSeqRef');
    expect(editorSource).toContain("draft ? '__draft__' : loadMenuCode");
    expect(editorSource).not.toContain('let ignore = false');

    const sectionSource2 = readFileSync(
      resolve('components/menu-master/MenuRecipeSection.jsx'),
      'utf8'
    );
    expect(sectionSource2).toContain('supportedCategory');
    expect(sectionSource2).toContain('메뉴코드를 입력하면 저장 시 이 레시피가 함께 저장됩니다');
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
        subCategory: '오리지널',
      },
      {
        menuCode: 'M002',
        menuName: '콤비네이션, 특선',
        size: 'R',
        price: null,
        status: 'discontinued',
        category: '',
        subCategory: '',
      },
    ];
    const result = buildMenuMasterCsvRows(rows);
    expect(result[0]).toEqual([
      '메뉴코드',
      '메뉴명',
      '규격',
      '판매가',
      '상태',
      '카테고리',
      '중분류',
    ]);
    expect(result[1]).toEqual(['M001', '마르게리타', 'L', 18000, 'active', '피자', '오리지널']);
    // 쉼표 포함 이름이 그대로 유지돼야 함 (rowsToCsv에서 이스케이프)
    expect(result[2][1]).toBe('콤비네이션, 특선');
    // null 가격은 빈 문자열
    expect(result[2][3]).toBe('');
  });
});
