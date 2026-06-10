/**
 * lib/menu-master/code-policy.js — menuCode base/full 해석 정책
 *
 * base: 메뉴마스터 size 접미사를 제거한 코드. 영양성분처럼 L/R 등 사이즈별
 *       마스터 행을 하나의 메뉴로 묶을 때 사용한다.
 * full: menuCode 원문. 원가 상세/판매가처럼 사이즈별 레코드를 구분할 때 사용한다.
 */

export const MENU_CODE_MODE = Object.freeze({
  BASE: 'base',
  FULL: 'full',
});

export const MENU_CODE_POLICY_BY_MODULE = Object.freeze({
  nutrition: MENU_CODE_MODE.BASE,
  nutritionImport: MENU_CODE_MODE.BASE,
  menuPickerDedup: MENU_CODE_MODE.BASE,
  costDetail: MENU_CODE_MODE.FULL,
  sellingPrice: MENU_CODE_MODE.FULL,
});

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

export function stripMenuCodeSizeSuffix(menuCode, size) {
  const code = asText(menuCode);
  const sizeText = asText(size);
  if (!code || !sizeText) return code;
  const suffix = `-${sizeText}`;
  return code.toLowerCase().endsWith(suffix.toLowerCase())
    ? code.slice(0, -suffix.length)
    : code;
}

export function getMenuCodeBase(menuOrCode, explicitSize = undefined) {
  const isRecord = menuOrCode && typeof menuOrCode === 'object';
  const menuCode = isRecord ? menuOrCode.menuCode : menuOrCode;
  const size = explicitSize !== undefined ? explicitSize : isRecord ? menuOrCode.size : undefined;
  return stripMenuCodeSizeSuffix(menuCode, size);
}

export function normalizeMenuCodeForModule(menuOrCode, options = {}) {
  const mode = options.mode === MENU_CODE_MODE.BASE ? MENU_CODE_MODE.BASE : MENU_CODE_MODE.FULL;
  if (mode === MENU_CODE_MODE.BASE) return getMenuCodeBase(menuOrCode, options.size);
  return asText(menuOrCode && typeof menuOrCode === 'object' ? menuOrCode.menuCode : menuOrCode);
}
