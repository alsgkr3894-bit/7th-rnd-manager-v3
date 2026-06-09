/**
 * lib/cost/menu-price/parse.js — 메뉴 판매가 엑셀/CSV 파싱
 *
 * 입력: { headers, rows } (lib/excel.js의 readExcelFile/readCsvFile 결과)
 * 출력: { ok, success[], failed[], error? }
 */

import { matchColumn } from '@/lib/excel';
import { tryParsePrice } from '@/lib/parse';
import { getMenuPriceCategories } from './template';

const COL_DEFS = {
  menuCode: ['메뉴코드', '코드'],
  category: ['분류', '카테고리'],
  menuName: ['메뉴명', '상품명', '메뉴이름'],
  size:     ['규격', '사이즈', '크기'],
  price:    ['판매가', '가격', '판매가격'],
  note:     ['비고', '메모', '특이사항'],
};

/**
 * @param {string[]} headers
 * @param {object[]} rows — readExcelFile().rows (key=헤더)
 * @returns {{ok:boolean, error?:string, success:object[], failed:object[]}}
 */
export function parseMenuPriceRows(headers, rows) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const col = {};
  for (const [key, candidates] of Object.entries(COL_DEFS)) {
    col[key] = matchColumn(safeHeaders, candidates);
  }

  const required = ['menuName', 'price'];
  const missing  = required.filter(k => !col[k]);
  if (missing.length > 0) {
    return {
      ok: false,
      success: [],
      failed: [],
      error: `필수 컬럼 누락: ${missing.map(k => COL_DEFS[k][0]).join(', ')}`,
    };
  }

  const success = [];
  const failed  = [];

  // 프리셋이 있으면(7번가) 화이트리스트 검증, 없으면(타 브랜드) 입력값 그대로 사용
  const presetCats = getMenuPriceCategories();

  for (let i = 0; i < safeRows.length; i++) {
    const row = safeRows[i] || {};
    const get = (k) => col[k] ? String(row[col[k]] ?? '').trim() : '';

    const menuName = get('menuName');
    if (!menuName) {
      failed.push({ rowIndex: i + 1, reason: '메뉴명 누락' });
      continue;
    }

    const priceRaw = get('price');
    const priceNum = tryParsePrice(priceRaw);
    if (priceNum == null) {
      failed.push({ rowIndex: i + 1, menuName, reason: '판매가 인식 실패', raw: priceRaw });
      continue;
    }

    const categoryRaw = get('category');
    const category = presetCats.length === 0
      ? categoryRaw
      : (presetCats.includes(categoryRaw) ? categoryRaw : '');
    const sizeRaw = get('size');
    const size = sizeRaw || ((category === '피자' || category.startsWith('피자/')) ? 'L' : '단일');

    success.push({
      menuCode: get('menuCode'),
      category,
      menuName,
      size,
      price: priceNum,
      note: get('note'),
    });
  }

  return { ok: true, success, failed };
}
