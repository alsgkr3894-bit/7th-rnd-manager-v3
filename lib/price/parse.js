/**
 * lib/price/parse.js — 제때 가격 엑셀/CSV 파싱
 *
 * 입력: { headers, rows } (lib/excel.js의 readExcelFile/readCsvFile 결과)
 * 출력: { ok, success[], failed[], error? }
 */

import { matchColumn } from '../excel';
import { parseAmount } from '../format';
import { tryParsePrice, parseTaxType, parseExcelDate } from '../parse';

const COL_DEFS = {
  productCode: ['제품코드', '상품코드', '코드'],
  productName: ['제품명', '상품명', '품목명'],
  productStatus: ['제품상태', '상태'],
  temperature: ['온도', '보관구분', '품목구분'],
  salesUnit: ['판매단위', '단위'],
  taxType: ['과세구분', '과세', '면세'],
  price: ['단가', '신규 판매가', '판매가'],
  quantity: ['수량', '주문수량'],
  totalAmount: ['합계', '합계금액', '금액'],
  supplyAmount: ['공급가'],
  vatAmount: ['부가세'],
  orderBaseDate: ['주문기준일'],
  deliveryDate: ['배송일'],
};

/**
 * @param {string[]} headers
 * @param {object[]} rows — readExcelFile().rows (객체 배열, key=헤더)
 * @returns {{ ok: boolean, error?: string, success: object[], failed: object[] }}
 */
export function parsePriceRows(headers, rows) {
  // 각 필드에 해당하는 실제 헤더 문자열을 찾는다
  const col = {};
  for (const [key, candidates] of Object.entries(COL_DEFS)) {
    col[key] = matchColumn(headers, candidates); // 문자열 또는 null
  }

  // 필수 컬럼 확인. productCode도 필수다 — 식자재 단가는 전부 제품코드로 연결되므로, 코드 열 없이
  // 저장하면 모든 식자재가 조용히 수동 단가로 떨어진다(2026-10-30 점검).
  const required = ['productCode', 'productName', 'taxType', 'price'];
  const missing = required.filter(k => !col[k]);
  if (missing.length > 0) {
    return { ok: false, error: `필수 컬럼을 찾을 수 없습니다: ${missing.join(', ')}` };
  }
  // 같은 이름의 열이 둘 이상이면 어느 쪽 값이 쓰였는지 알 수 없다(뒤의 열이 앞을 덮어쓴다)
  const ambiguous = required.filter(
    k => headers.filter(h => String(h).trim() === String(col[k]).trim()).length > 1
  );
  if (ambiguous.length > 0) {
    return {
      ok: false,
      error: `같은 이름의 열이 여러 개라 값을 정할 수 없습니다: ${ambiguous
        .map(k => col[k])
        .join(', ')}`,
    };
  }

  const success = [];
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = k => (col[k] ? String(row[col[k]] ?? '').trim() : '');
    // 날짜 칸은 원래 값을 그대로 넘긴다 — 문자열로 바꾸면 SheetJS Date 객체가 날짜로 안 읽힌다
    const getRaw = k => (col[k] ? row[col[k]] : '');

    const productName = get('productName');
    if (!productName) {
      failed.push({
        rowIndex: i + 1,
        productCode: get('productCode'),
        productName: '',
        reason: '제품명 누락',
        raw: '',
      });
      continue;
    }

    // 식자재 마스터는 제품코드를 대문자로 저장한다 — 단가 파일도 같은 표기로 맞춰야 대소문자 때문에 단가가 안 붙는 일이 없다
    const productCode = get('productCode').toUpperCase();
    const priceRaw = get('price');
    const taxRaw = get('taxType').replace(/\s/g, '');

    const priceNum = tryParsePrice(priceRaw);
    if (priceNum === null) {
      failed.push({
        rowIndex: i + 1,
        productCode,
        productName,
        reason: '단가 인식 실패',
        raw: priceRaw,
      });
      continue;
    }

    if (priceNum < 0) {
      failed.push({
        rowIndex: i + 1,
        productCode,
        productName,
        reason: '음수 단가',
        raw: priceRaw,
      });
      continue;
    }

    const parsedTaxType = parseTaxType(taxRaw);
    if (!parsedTaxType) {
      failed.push({
        rowIndex: i + 1,
        productCode,
        productName,
        reason: '과세구분 인식 실패',
        raw: taxRaw,
      });
      continue;
    }

    const price = priceNum;
    const priceWithTax = parsedTaxType === '과세' ? Math.round(price * 1.1) : price;

    success.push({
      productCode,
      productName,
      productStatus: get('productStatus'),
      temperature: get('temperature'),
      salesUnit: get('salesUnit'),
      taxType: parsedTaxType,
      price,
      priceWithTax,
      quantity: parseAmount(get('quantity')),
      totalAmount: parseAmount(get('totalAmount')),
      supplyAmount: parseAmount(get('supplyAmount')),
      vatAmount: parseAmount(get('vatAmount')),
      orderBaseDate: parseExcelDate(getRaw('orderBaseDate')),
      deliveryDate: parseExcelDate(getRaw('deliveryDate')),
    });
  }

  return { ok: true, success, failed };
}
