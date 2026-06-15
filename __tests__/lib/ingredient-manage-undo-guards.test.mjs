import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');

describe('ingredient manage undo guards', () => {
  test('삭제 실행취소는 restoreRecord 실패를 숨기지 않는다', () => {
    expect(source).not.toContain("restoreRecord('cost_ingredients', backup.ingredient).catch");
    expect(source).not.toContain("restoreRecord('cost_ingredients', rec.ingredient).catch");
    expect(source).toContain('restoreDeletedIngredientBackup');
    expect(source).toContain('restoreDeletedIngredientBackups');
    expect(source).toContain("showToast('실행취소 실패: ' + err.message, 'error')");
  });

  test('일괄 실행취소는 실패 개수를 사용자 메시지로 만든다', () => {
    expect(source).toContain('throw new Error(`${failures.length}개 항목 복구 실패`)');
    expect(source).toContain("console.error('[IngredientManage] undo batch delete failed'");
  });

  test('일괄 삭제는 부분 실패를 사용자에게 노출한다', () => {
    expect(source).toContain('const { removed, failures } = await bulkDeleteIngredients(ids)');
    expect(source).toContain('buildBulkDeleteToast');
    expect(source).toContain('${removed.length}개 삭제됨 · ${failures.length}개 실패');
  });
});
