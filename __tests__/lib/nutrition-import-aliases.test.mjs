/**
 * localStorage 기반이라 node 테스트 환경에 없는 전역을 최소 구현으로 채워준다.
 */
function installMemoryLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

installMemoryLocalStorage();

const { rememberNutritionImportAliases, loadNutritionImportAliases } =
  await import('../../lib/nutrition/import-aliases.js');
const { normalizeImportMatchKey } = await import('../../lib/nutrition/values/import.js');

describe('rememberNutritionImportAliases', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test('1인용 행의 baseName alias는 일반 메뉴와 다른 키에 저장돼 서로 덮어쓰지 않는다', () => {
    rememberNutritionImportAliases([
      {
        rawName: '페페로니 (석쇠 L)',
        baseName: '페페로니',
        menuCode: 'P-PEP-010',
        menuName: '페페로니',
        category: '피자',
        personal: false,
      },
    ]);
    rememberNutritionImportAliases([
      {
        rawName: '페페로니 (1인용)',
        baseName: '페페로니',
        menuCode: 'P-ONE-010',
        menuName: '페페로니 (1인용)',
        category: '피자',
        personal: true,
      },
    ]);

    const aliases = loadNutritionImportAliases();
    expect(aliases[normalizeImportMatchKey('페페로니')].menuCode).toBe('P-PEP-010');
    expect(aliases[normalizeImportMatchKey('페페로니 (1인용)')].menuCode).toBe('P-ONE-010');
  });
});
