import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 실행취소 로직은 actions 훅 + utils로 분리됨
const actionsSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientManageActions.js'),
  'utf8'
);
const utilsSource = readFileSync(resolve('app/ingredient/manage/ingredientManageUtils.js'), 'utf8');
const pageSource = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');

describe('ingredient manage undo guards', () => {
  test('page는 actions 훅에 위임하고 직접 restore를 호출하지 않는다', () => {
    expect(pageSource).not.toContain("restoreRecord('cost_ingredients', backup.ingredient).catch");
    expect(pageSource).not.toContain("restoreRecord('cost_ingredients', rec.ingredient).catch");
    // page는 훅을 import
    expect(pageSource).toContain('useIngredientManageActions');
  });

  test('삭제 실행취소는 restoreRecord 실패를 숨기지 않는다', () => {
    expect(actionsSource).toContain('restoreDeletedIngredientBackup');
    expect(actionsSource).toContain('restoreDeletedIngredientBackups');
    expect(actionsSource).toContain("showToast('실행취소 실패: ' + err.message, 'error')");
  });

  test('일괄 실행취소는 실패 개수를 사용자 메시지로 만든다', () => {
    expect(utilsSource).toContain('throw new Error(`${failures.length}개 항목 복구 실패`)');
    expect(actionsSource).toContain("console.error('[IngredientManage] undo batch delete failed'");
  });

  test('일괄 삭제는 부분 실패를 사용자에게 노출한다', () => {
    expect(actionsSource).toContain(
      'const { removed, failures } = await bulkDeleteIngredients(ids)'
    );
    expect(actionsSource).toContain('buildBulkDeleteToast');
    expect(utilsSource).toContain('${removed.length}개 삭제됨 · ${failures.length}개 실패');
  });

  test('warnIngredientCascadeFailures는 cascade 실패 건수를 toast로 노출한다', () => {
    expect(utilsSource).toContain('warnIngredientCascadeFailures');
    expect(utilsSource).toContain('cascadeErrors');
    expect(utilsSource).toContain('showToast');
    // 건수 계산: records[].cascadeErrors.length 합산
    expect(utilsSource).toContain('cascadeErrors?.length');
  });

  test('단건 삭제 후 warnIngredientCascadeFailures가 호출된다', () => {
    expect(actionsSource).toContain('warnIngredientCascadeFailures([backup])');
  });

  test('일괄 삭제 후 warnIngredientCascadeFailures가 호출된다', () => {
    expect(actionsSource).toContain('warnIngredientCascadeFailures(removed)');
  });
});
