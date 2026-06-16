import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMenuCodeDisplayList,
  filterMenuCodeOptions,
  getBaseCode,
  getNextMenuCodeActiveIndex,
} from '../../components/ui/menu-code-picker/menuCodePickerUtils.js';
import { MENU_CODE_MODE } from '../../lib/menu-master/code-policy.js';

const pickerSource = readFileSync(resolve('components/ui/MenuCodePicker.jsx'), 'utf8');
const utilsSource = readFileSync(
  resolve('components/ui/menu-code-picker/menuCodePickerUtils.js'),
  'utf8'
);
const selectedSource = readFileSync(
  resolve('components/ui/menu-code-picker/SelectedMenuCodePill.jsx'),
  'utf8'
);
const searchSource = readFileSync(
  resolve('components/ui/menu-code-picker/MenuCodeSearchField.jsx'),
  'utf8'
);
const dropdownSource = readFileSync(
  resolve('components/ui/menu-code-picker/MenuCodeDropdown.jsx'),
  'utf8'
);
const optionSource = readFileSync(
  resolve('components/ui/menu-code-picker/MenuCodeDropdownOption.jsx'),
  'utf8'
);

const masters = [
  {
    menuCode: 'P-OR-002-L',
    menuName: '오리지널 피자',
    subCategory: '오리지널',
    category: '피자',
    size: 'L',
  },
  {
    menuCode: 'P-OR-002-R',
    menuName: '오리지널 피자',
    subCategory: '오리지널',
    category: '피자',
    size: 'R',
  },
  {
    menuCode: 'S-SIDE-001',
    menuName: '치킨 사이드',
    subCategory: '사이드',
    category: '사이드',
    size: '',
  },
  {
    menuCode: 'P-OR-999-L',
    menuName: '단종 피자',
    subCategory: '오리지널',
    category: '피자',
    size: 'L',
    status: 'discontinued',
  },
];

describe('menu code picker helpers', () => {
  test('base mode deduplicates sizes while preserving active menu metadata', () => {
    const list = buildMenuCodeDisplayList(masters, { mode: MENU_CODE_MODE.BASE });
    expect(list.map(row => row.code)).toEqual(['P-OR-002', 'S-SIDE-001']);
    expect(list[0].sizes.sort()).toEqual(['L', 'R']);
    expect(list[0].menuName).toBe('오리지널 피자');
    expect(list.some(row => row.code === 'P-OR-999')).toBe(false);
    expect(getBaseCode(masters[0])).toBe('P-OR-002');
  });

  test('full mode keeps size-specific menu codes', () => {
    const list = buildMenuCodeDisplayList(masters, { mode: MENU_CODE_MODE.FULL });
    expect(list.map(row => row.code)).toEqual(['P-OR-002-L', 'P-OR-002-R', 'S-SIDE-001']);
  });

  test('filtering and keyboard index movement stay deterministic', () => {
    const list = buildMenuCodeDisplayList(masters, { mode: MENU_CODE_MODE.BASE });
    expect(filterMenuCodeOptions(list, '치킨').map(row => row.code)).toEqual(['S-SIDE-001']);
    expect(filterMenuCodeOptions(list, '오리지널').map(row => row.code)).toEqual(['P-OR-002']);
    expect(getNextMenuCodeActiveIndex(-1, 'ArrowDown', 2)).toBe(0);
    expect(getNextMenuCodeActiveIndex(0, 'ArrowDown', 2)).toBe(1);
    expect(getNextMenuCodeActiveIndex(0, 'ArrowUp', 2)).toBe(0);
    expect(getNextMenuCodeActiveIndex(2, 'ArrowDown', 0)).toBe(-1);
  });
});

describe('menu code picker structure', () => {
  test('MenuCodePicker delegates list derivation and rendering details', () => {
    expect(pickerSource).toContain('export default function MenuCodePicker');
    expect(pickerSource).toContain('buildMenuCodeDisplayList(menuMasters, { dedup, mode })');
    expect(pickerSource).toContain('filterMenuCodeOptions(displayList, q)');
    expect(pickerSource).toContain('getNextMenuCodeActiveIndex');
    expect(pickerSource).toContain('<SelectedMenuCodePill');
    expect(pickerSource).toContain('<MenuCodeSearchField');
    expect(pickerSource).toContain('<MenuCodeDropdown');
    expect(pickerSource).toContain("export { getBaseCode } from './menu-code-picker/menuCodePickerUtils'");
    expect(pickerSource).not.toContain('normalizeMenuCodeForModule');
    expect(pickerSource).not.toContain('parseCategoryFromCode');
    expect(pickerSource).not.toContain('getMenuCodeRank');
    expect(pickerSource).not.toContain('Icon.search');
    expect(pickerSource).not.toContain('Icon.close');
    expect(pickerSource).not.toContain('results.map');
  });

  test('extracted files own picker helper and UI responsibilities', () => {
    expect(utilsSource).toContain('export function buildMenuCodeDisplayList');
    expect(utilsSource).toContain('export function filterMenuCodeOptions');
    expect(utilsSource).toContain('export function getNextMenuCodeActiveIndex');
    expect(utilsSource).toContain('normalizeMenuCodeForModule');
    expect(utilsSource).toContain('parseCategoryFromCode');
    expect(selectedSource).toContain('export function SelectedMenuCodePill');
    expect(selectedSource).toContain('Icon.close');
    expect(selectedSource).toContain('선택 해제');
    expect(searchSource).toContain('export function MenuCodeSearchField');
    expect(searchSource).toContain('Icon.search');
    expect(searchSource).toContain('메뉴 마스터가 없습니다');
    expect(dropdownSource).toContain('export function MenuCodeDropdown');
    expect(dropdownSource).toContain('results.map');
    expect(optionSource).toContain('export function MenuCodeDropdownOption');
    expect(optionSource).toContain("onMouseEnter={() => onHover(index)}");
    expect(optionSource).toContain("join(' / ')");
  });
});
