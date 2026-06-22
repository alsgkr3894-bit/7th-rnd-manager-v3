/**
 * 파괴적 액션 실행함수 권한 가드(defense-in-depth) 구조 테스트.
 * 각 파괴적 함수가 assertActiveAdmin을 호출하는지, 저수준 프리미티브에는
 * 가드가 없는지를 소스 grep으로 검증한다. (role-gating-source.test.mjs 패턴)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 함수 본문 시작부터 다음 export(또는 EOF)까지 추출해 그 안에 가드 호출이 있는지 검사
function functionBody(source, fnName) {
  const start = source.indexOf(`function ${fnName}`);
  if (start === -1) return '';
  const after = source.indexOf('\nexport ', start + 1);
  return source.slice(start, after === -1 ? undefined : after);
}

describe('파괴적 액션 권한 가드', () => {
  test('식자재 삭제 함수가 assertActiveAdmin을 호출한다', () => {
    // store.js는 facade — 실제 구현은 destructive.js
    const s = src('lib/ingredient/destructive.js');
    expect(s).toContain("from '@/lib/auth/guard'");
    expect(functionBody(s, 'deleteIngredient')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'bulkDeleteIngredients')).toContain('assertActiveAdmin');
  });

  test('식자재 저장/시드 함수가 assertActiveAdmin을 호출한다', () => {
    const crud = src('lib/ingredient/crud.js');
    expect(crud).toContain("from '@/lib/auth/guard'");
    expect(functionBody(crud, 'addIngredient')).toContain('assertActiveAdmin');
    expect(functionBody(crud, 'updateIngredient')).toContain('assertActiveAdmin');
    expect(functionBody(crud, 'upsertIngredientMeta')).toContain('assertActiveAdmin');
    expect(functionBody(src('lib/ingredient/seed.js'), 'seedMasterIngredients')).toContain(
      'assertActiveAdmin'
    );
  });

  test('메뉴마스터 삭제/초기화/시드가 assertActiveAdmin을 호출한다', () => {
    const store = src('lib/menu-master/store.js');
    expect(store).toContain("from '@/lib/auth/guard'");
    expect(functionBody(store, 'upsertMenuMaster')).toContain('assertActiveAdmin');
    expect(functionBody(store, 'deleteMenuMaster')).toContain('assertActiveAdmin');
    expect(functionBody(store, 'resetAllMenuMaster')).toContain('assertActiveAdmin');
    const index = src('lib/menu-master/index.js');
    expect(index).toContain("from '@/lib/auth/guard'");
    expect(functionBody(index, 'syncMenuMasterFromPrices')).toContain('assertActiveAdmin');
    expect(functionBody(index, 'pushMasterToPrices')).toContain('assertActiveAdmin');
    expect(functionBody(index, 'importPricesToMaster')).toContain('assertActiveAdmin');
    const seed = src('lib/menu-master/seed.js');
    expect(functionBody(seed, 'seedMenuMaster')).toContain('assertActiveAdmin');
  });

  test('복원 실행함수(importAllToBrand)가 assertActiveAdmin을 호출한다', () => {
    const s = src('lib/db/backup.js');
    expect(s).toContain("from '@/lib/auth/guard'");
    expect(functionBody(s, 'importAllToBrand')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'replaceStoreForBrand')).toContain('assertActiveAdmin');
  });

  test('복원 실행함수(importAllToBrand)가 마지막 복원 저널을 남긴다', () => {
    const s = src('lib/db/backup.js');
    expect(s).toContain("from '@/lib/backup/restore-journal'");
    expect(functionBody(s, 'importAllToBrand')).toContain('createRestoreJournal');
    expect(functionBody(s, 'importAllToBrand')).toContain('updateRestoreJournal');
    expect(functionBody(s, 'importAllToBrand')).toContain('blocked_invalid_backup');
    expect(functionBody(s, 'importAllToBrand')).toContain('failed_partial');
  });

  test('백업 export 함수에는 가드가 없다(비파괴)', () => {
    const s = src('lib/db/backup.js');
    expect(functionBody(s, 'exportAllForBrand')).not.toContain('assertActiveAdmin');
  });

  test('계정 add/update/delete가 assertActiveAdmin을 호출한다', () => {
    const s = src('lib/auth/accounts.js');
    expect(s).toContain("from '@/lib/auth/guard'");
    expect(functionBody(s, 'addAccount')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'updateAccount')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'deleteAccount')).toContain('assertActiveAdmin');
  });

  test('계정 초기 시드(seedDefaultAdminIfEmpty)에는 가드가 없다', () => {
    const s = src('lib/auth/accounts.js');
    expect(functionBody(s, 'seedDefaultAdminIfEmpty')).not.toContain('assertActiveAdmin');
  });

  test('시스템 페이지가 useCurrentRole + 핸들러 가드를 쓴다', () => {
    const s = src('app/settings/system/page.jsx');
    expect(s).toContain("from '@/hooks/useCurrentRole'");
    expect(s).toContain("from '@/lib/auth/guard'");
    // 두 위험 핸들러 모두 가드 호출
    expect(s).toMatch(/handleRecreate[\s\S]*?assertActiveAdmin/);
    expect(s).toMatch(/handleReset[\s\S]*?assertActiveAdmin/);
    // 위험영역 disabled 가드는 UI 컴포넌트(SystemDangerZoneCard)로 이동
    const uiSrc = src('app/settings/system/_system-settings/SystemDangerZoneCard.jsx');
    expect(uiSrc).toContain('!isAdmin');
  });

  test('저수준 DB 프리미티브(crud.js)에는 가드가 없다', () => {
    expect(src('lib/db/crud.js')).not.toContain('assertActiveAdmin');
  });

  // 2026-06-19 확대: reset*/clear*/replaceAll*/bulkImport* 군 defense-in-depth 가드
  // store.js는 facade — 각 구현 파일에서 가드 존재 여부를 검증한다
  test('식자재 대량 변경/초기화 함수가 assertActiveAdmin을 호출한다', () => {
    const destructive = src('lib/ingredient/destructive.js');
    for (const fn of [
      'resetAllIngredients',
      'removeCategoryFromAll',
      'removeTagFromAll',
      'removeManyTagsFromAll',
      'renameCategoryInAll',
      'renameTagInAll',
      'bulkSetDiscontinued',
      'bulkSetCategory',
      'excludeIngredientByCode',
      'restoreIngredientByCode',
    ]) {
      expect(functionBody(destructive, fn)).toContain('assertActiveAdmin');
    }
    // bulkImportIngredients는 import.js에 위치
    expect(functionBody(src('lib/ingredient/import.js'), 'bulkImportIngredients')).toContain(
      'assertActiveAdmin'
    );
    // repairIngredientProductCodeDuplicates는 dedupe-repair.js에 위치
    expect(
      functionBody(src('lib/ingredient/dedupe-repair.js'), 'repairIngredientProductCodeDuplicates')
    ).toContain('assertActiveAdmin');
  });

  test('판매가 초기화/일괄교체가 assertActiveAdmin을 호출한다', () => {
    const s = src('lib/cost/menu-price/store.js');
    expect(s).toContain("from '@/lib/auth/guard'");
    expect(functionBody(s, 'addMenuPrice')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'updateMenuPrice')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'deleteMenuPrice')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'resetAllMenuPrices')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'replaceAllMenuPrices')).toContain('assertActiveAdmin');
  });

  test('제때 단가·출고량 업로드 저장/삭제가 assertActiveAdmin을 호출한다', () => {
    const price = src('lib/price/store.js');
    expect(price).toContain("from '@/lib/auth/guard'");
    expect(functionBody(price, 'savePriceUpload')).toContain('assertActiveAdmin');
    expect(functionBody(price, 'deletePriceFile')).toContain('assertActiveAdmin');

    const shipment = src('lib/shipment/store-files.js');
    expect(shipment).toContain("from '@/lib/auth/guard'");
    expect(functionBody(shipment, 'saveShipmentUpload')).toContain('assertActiveAdmin');
    expect(functionBody(shipment, 'deleteShipmentFile')).toContain('assertActiveAdmin');

    const uploadLog = src('lib/db/upload-log.js');
    expect(uploadLog).toContain("from '@/lib/auth/guard'");
    expect(functionBody(uploadLog, 'deleteFileWithLog')).toContain('assertActiveAdmin');
  });

  test('제때 관리품목 변경 함수가 assertActiveAdmin을 호출한다', () => {
    const managed = src('lib/shipment/store-managed.js');
    expect(managed).toContain("from '@/lib/auth/guard'");
    expect(functionBody(managed, 'seedManagedProductsIfEmpty')).toContain('assertActiveAdmin');
    for (const fn of ['addManagedProduct', 'updateManagedProduct', 'deleteManagedProduct']) {
      expect(functionBody(managed, fn)).toContain('assertActiveAdmin');
    }

    const migration = src('lib/shipment/store-migration.js');
    expect(migration).toContain("from '@/lib/auth/guard'");
    expect(functionBody(migration, 'migrateExclusiveFromPriceList')).toContain('assertActiveAdmin');
  });

  test('마진 플랫폼 설정과 기준수량 동기화가 assertActiveAdmin을 호출한다', () => {
    const platforms = src('lib/cost/margin/platforms.js');
    expect(platforms).toContain("from '@/lib/auth/guard'");
    expect(functionBody(platforms, 'savePlatforms')).toContain('assertActiveAdmin');

    const syncBaseQty = src('lib/cost/sync-base-quantity.js');
    expect(syncBaseQty).toContain("from '@/lib/auth/guard'");
    expect(functionBody(syncBaseQty, 'applySyncPlan')).toContain('assertActiveAdmin');

    const bulkPrice = src('lib/cost/bulk-price-update.js');
    expect(bulkPrice).toContain("from '@/lib/auth/guard'");
    expect(functionBody(bulkPrice, 'commitBulkPrice')).toContain('assertActiveAdmin');
  });

  test('판매량 사용자 규칙 CRUD와 업로드 변경 함수가 assertActiveAdmin을 호출한다', () => {
    const rules = src('lib/sales/store-user-rules.js');
    expect(rules).toContain("from '@/lib/auth/guard'");
    for (const fn of [
      'addUserAlias',
      'deleteUserAlias',
      'updateUserAlias',
      'addUserRule',
      'deleteUserRule',
      'updateUserRule',
      'addUserExcluded',
      'deleteUserExcluded',
      'updateUserExcluded',
    ]) {
      expect(functionBody(rules, fn)).toContain('assertActiveAdmin');
    }

    const files = src('lib/sales/store-files.js');
    expect(files).toContain("from '@/lib/auth/guard'");
    for (const fn of ['saveSalesUpload', 'deleteSalesFile', 'replaceFileClassification']) {
      expect(functionBody(files, fn)).toContain('assertActiveAdmin');
    }

    const resolve = src('lib/sales/resolve.js');
    for (const fn of ['resolveUnmatchedIssue', 'bulkExcludeIssues', 'bulkResolveRule']) {
      expect(functionBody(resolve, fn)).toContain('assertActiveAdmin');
    }
  });

  test('오래된 데이터 정리 함수는 assertActiveAdmin을 호출한다', () => {
    const report = src('lib/report/index.js');
    expect(report).toContain("from '@/lib/auth/guard'");
    expect(functionBody(report, 'deleteReport')).toContain('assertActiveAdmin');
    expect(functionBody(report, 'pruneOldReports')).toContain('assertActiveAdmin');

    const workLog = src('lib/work-log.js');
    expect(workLog).toContain("from '@/lib/auth/guard'");
    expect(functionBody(workLog, 'pruneOldWorkLogs')).toContain('assertActiveAdmin');

    const costShared = src('lib/cost/shared/store.js');
    expect(costShared).toContain("from '@/lib/auth/guard'");
    expect(functionBody(costShared, 'pruneOldCostUploadLogs')).toContain('assertActiveAdmin');
  });

  test('노트와 일정 쓰기 함수가 assertActiveAdmin을 호출한다', () => {
    const notes = src('lib/note/store.js');
    expect(notes).toContain("from '@/lib/auth/guard'");
    for (const fn of [
      'addNote',
      'updateNote',
      'bulkUpdateBoardOrder',
      'deleteNote',
      'duplicateNote',
    ]) {
      expect(functionBody(notes, fn)).toContain('assertActiveAdmin');
    }

    const schedules = src('lib/note/schedules.js');
    expect(schedules).toContain("from '@/lib/auth/guard'");
    for (const fn of ['addSchedule', 'updateSchedule', 'deleteSchedule']) {
      expect(functionBody(schedules, fn)).toContain('assertActiveAdmin');
    }
  });

  test('엣지/도우·레시피·영양 기준데이터·원산지 변경 함수가 가드를 호출한다', () => {
    const edgeDough = src('lib/cost/edge-dough/store.js');
    for (const fn of ['upsertEdge', 'deleteEdge', 'resetAllEdges', 'seedEdges']) {
      expect(functionBody(edgeDough, fn)).toContain('assertActiveAdmin');
    }
    expect(functionBody(src('lib/menu-recipes/store.js'), 'resetAllMenuRecipes')).toContain(
      'assertActiveAdmin'
    );
    expect(functionBody(src('lib/nutrition/values/raw-values.js'), 'clearAllBaseData')).toContain(
      'assertActiveAdmin'
    );
    expect(functionBody(src('lib/nutrition/values/raw-values.js'), 'clearAllBaseData')).toContain(
      "runTransaction(stores, 'readwrite'"
    );
    const origin = src('lib/nutrition/origin/store.js');
    expect(functionBody(origin, 'upsertOrigin')).toContain('assertActiveAdmin');
    expect(functionBody(origin, 'deleteOrigin')).toContain('assertActiveAdmin');
    expect(functionBody(origin, 'clearAllOrigins')).toContain('assertActiveAdmin');
    expect(
      functionBody(src('lib/nutrition/migrate-to-ingredient.js'), 'migrateNutritionToIngredients')
    ).toContain('assertActiveAdmin');
  });

  test('메뉴 레시피 저장/삭제가 assertActiveAdmin을 호출한다', () => {
    const recipes = src('lib/menu-recipes/store.js');
    expect(functionBody(recipes, 'upsertMenuRecipe')).toContain('assertActiveAdmin');
    expect(functionBody(recipes, 'deleteMenuRecipe')).toContain('assertActiveAdmin');
    expect(functionBody(recipes, 'resetAllMenuRecipes')).toContain('assertActiveAdmin');
  });

  test('영양 values 쓰기/삭제/수리 함수가 assertActiveAdmin을 호출한다', () => {
    const raw = src('lib/nutrition/values/raw-values.js');
    for (const fn of [
      'upsertRawValue',
      'bulkUpsertBaseData',
      'deleteRawValue',
      'deleteRawValuesByMenuCode',
      'repairNutritionBaseDuplicates',
    ]) {
      expect(functionBody(raw, fn)).toContain('assertActiveAdmin');
    }

    const refs = src('lib/nutrition/values/menu-refs.js');
    for (const fn of [
      'upsertMenuRef',
      'deleteMenuRef',
      'deleteMenuRefsByMenuCode',
      'deleteMenuRefsByMenuCodes',
    ]) {
      expect(functionBody(refs, fn)).toContain('assertActiveAdmin');
    }

    expect(functionBody(src('lib/nutrition/values/edge.js'), 'upsertEdge')).toContain(
      'assertActiveAdmin'
    );

    const topping = src('lib/nutrition/values/topping.js');
    expect(functionBody(topping, 'upsertTopping')).toContain('assertActiveAdmin');
    expect(functionBody(topping, 'deleteTopping')).toContain('assertActiveAdmin');

    const composition = src('lib/nutrition/values/composition.js');
    expect(functionBody(composition, 'upsertComposition')).toContain('assertActiveAdmin');
    expect(functionBody(composition, 'deleteComposition')).toContain('assertActiveAdmin');

    const setComposition = src('lib/nutrition/values/set-composition.js');
    for (const fn of ['repairSetCompositions', 'upsertSetComposition', 'deleteSetComposition']) {
      expect(functionBody(setComposition, fn)).toContain('assertActiveAdmin');
    }

    const facade = src('lib/nutrition/values/store.js');
    expect(facade).not.toContain("from './shared'");
    expect(facade).not.toContain('upsertWithTimestamp');
    expect(facade).not.toContain('upsertUniqueByIndex');
  });

  test('원가 보조 마스터와 샘플 기록 쓰기 함수가 assertActiveAdmin을 호출한다', () => {
    const recipeGroups = src('lib/cost/recipe-groups/store.js');
    expect(functionBody(recipeGroups, 'saveRecipeGroup')).toContain('assertActiveAdmin');
    expect(functionBody(recipeGroups, 'deleteRecipeGroup')).toContain('assertActiveAdmin');

    const suppliers = src('lib/cost/suppliers/store.js');
    for (const fn of ['addSupplier', 'updateSupplier', 'deleteSupplier']) {
      expect(functionBody(suppliers, fn)).toContain('assertActiveAdmin');
    }

    const samples = src('lib/sample/store.js');
    for (const fn of ['addSample', 'updateSample', 'deleteSample']) {
      expect(functionBody(samples, fn)).toContain('assertActiveAdmin');
    }

    const snapshots = src('lib/cost/margin/snapshots.js');
    expect(functionBody(snapshots, 'saveSnapshot')).toContain('assertActiveAdmin');
    expect(functionBody(snapshots, 'deleteSnapshot')).toContain('assertActiveAdmin');
  });
});
