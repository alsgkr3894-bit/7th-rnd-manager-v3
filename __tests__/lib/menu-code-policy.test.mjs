import {
  MENU_CODE_MODE,
  getMenuCodeBase,
  normalizeMenuCodeForModule,
  stripMenuCodeSizeSuffix,
} from '../../lib/menu-master/code-policy.js';

describe('menu code base/full policy', () => {
  test('base mode strips only the explicit menu size suffix', () => {
    expect(getMenuCodeBase({ menuCode: 'P-OR-005-L', size: 'L' })).toBe('P-OR-005');
    expect(getMenuCodeBase({ menuCode: 'SET-FAM-001-R', size: 'R' })).toBe('SET-FAM-001');
  });

  test('base mode keeps codes when size is absent or does not match the suffix', () => {
    expect(getMenuCodeBase({ menuCode: 'S-CHK-001', size: null })).toBe('S-CHK-001');
    expect(getMenuCodeBase({ menuCode: 'D-CC-001-355', size: null })).toBe('D-CC-001-355');
    expect(getMenuCodeBase({ menuCode: 'P-OR-005-L', size: 'R' })).toBe('P-OR-005-L');
  });

  test('full mode preserves the menuCode', () => {
    const menu = { menuCode: 'P-OR-005-L', size: 'L' };

    expect(normalizeMenuCodeForModule(menu, { mode: MENU_CODE_MODE.FULL })).toBe('P-OR-005-L');
  });

  test('base mode is case-insensitive for the size suffix', () => {
    expect(stripMenuCodeSizeSuffix('p-or-005-l', 'L')).toBe('p-or-005');
  });
});
