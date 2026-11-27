import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const exportSelected = jest.fn();
const downloadBackup = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({ exportSelected }));
jest.unstable_mockModule('@/lib/download', () => ({
  downloadBackup,
  makeFileName: (prefix, ext) => `${prefix}.${ext}`,
}));

const { downloadRecoveryPoint, recoveryNote } = await import('../../lib/backup/recovery-point.js');

beforeEach(() => {
  exportSelected.mockReset();
  downloadBackup.mockReset();
});

describe('삭제 전 복구 파일', () => {
  test('데이터가 있는 저장소만 담아 내려받고, 설정은 넣지 않는다', async () => {
    exportSelected.mockResolvedValue({
      version: 'v3',
      stores: { menu_master: [{ id: 1 }], cost_selling_prices: [] },
    });

    const result = await downloadRecoveryPoint(['menu_master', 'cost_selling_prices'], '메뉴');

    expect(result).toEqual({ fileName: '삭제전복구_메뉴.gz', rows: 1 });
    expect(Object.keys(downloadBackup.mock.calls[0][0].stores)).toEqual(['menu_master']);
    // 지우는 저장소가 민감 store여도 되돌릴 수 있어야 한다
    expect(exportSelected.mock.calls[0][2]).toEqual({
      includeLocalStorage: false,
      includeSensitive: true,
    });
    expect(recoveryNote(result)).toContain('삭제전복구_메뉴.gz');
  });

  test('지울 것이 없으면 파일을 만들지 않는다', async () => {
    exportSelected.mockResolvedValue({ stores: { menu_master: [] } });

    await expect(downloadRecoveryPoint(['menu_master'], '메뉴')).resolves.toBeNull();
    expect(downloadBackup).not.toHaveBeenCalled();
    expect(recoveryNote(null)).toBe('');
  });

  test('읽지 못한 저장소가 있으면 예외를 던져 삭제를 막는다', async () => {
    exportSelected.mockResolvedValue({
      stores: { menu_master: [{ id: 1 }] },
      failedStores: [{ store: 'cost_edge_dough', error: 'boom' }],
    });

    await expect(downloadRecoveryPoint(['menu_master'], '메뉴')).rejects.toThrow('cost_edge_dough');
    expect(downloadBackup).not.toHaveBeenCalled();
  });
});

describe('대량 삭제 경로는 지우기 전에 복구 파일을 만든다', () => {
  test.each([
    ['components/cost/ingredient-price/IngredientPriceView.jsx', 'await resetAllIngredients()'],
    ['app/ingredient/manage/useIngredientManageActions.js', 'await resetAllIngredients()'],
    ['app/menu-master/useMenuMasterActions.js', 'await resetAllMenuMaster()'],
    ['components/cost/manage/CommonManageView.jsx', 'await resetAllEdges()'],
    ['components/nutrition/menu/TabBase.jsx', 'await clearAllBaseData()'],
    ['app/settings/system/page.jsx', 'await deleteDatabase('],
    ['app/settings/system/page.jsx', 'await clearStore(name)'],
  ])('%s: %s', (file, destructive) => {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    const at = source.indexOf(destructive);
    expect(at).toBeGreaterThan(0);
    // 같은 처리 함수 안에서 삭제보다 앞에 있어야 한다
    const before = source.slice(Math.max(0, at - 700), at);
    expect(before).toContain('downloadRecoveryPoint(');
  });

  test('전체 초기화와 DB 재생성은 저장 확인과 확인 문구 입력을 받는다', () => {
    const page = readFileSync(
      new URL('../../app/settings/system/page.jsx', import.meta.url),
      'utf8'
    );
    const card = readFileSync(
      new URL(
        '../../app/settings/system/_system-settings/SystemDangerZoneCard.jsx',
        import.meta.url
      ),
      'utf8'
    );
    expect(page.match(/if \(!confirmRecoverySaved\(recovery\)\)/g)).toHaveLength(2);
    expect(card.match(/requireText="삭제"/g)).toHaveLength(2);
  });
});
