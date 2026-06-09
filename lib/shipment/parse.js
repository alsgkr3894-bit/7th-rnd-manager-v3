/**
 * lib/shipment/parse.js — 제때 출고량 엑셀/CSV 파싱
 *
 * 입력: { headers, rows }
 * 출력: { ok, error?, colMap, success[], failed[] }
 */

import { normalizeProductName } from '../normalize';

const COL_CANDIDATES = {
  productCode: ['제품코드', '상품코드', '코드'],
  productName: ['제품명', '상품명', '품목명'],
  unit: ['판매단위', '단위'],
  temperature: ['온도'],
  taxType: ['과세구분'],
  quantity: ['배송수량', '출고수량', '주문수량', '수량'],
  unitPrice: ['단가'],
  vatAmount: ['부가세', 'VAT'],
  amount: ['합계', '합계금액', '금액', '총금액'],
};

const REQUIRED_COLS = ['productCode', 'productName', 'quantity', 'amount'];
const REQUIRED_LABELS = {
  productCode: '제품코드',
  productName: '제품명',
  quantity: '배송수량',
  amount: '합계',
};

function normH(str) {
  return String(str ?? '')
    .replace(/[\n\r\s]/g, '')
    .toLowerCase();
}

function tryNum(raw) {
  if (raw == null || raw === '') return { val: 0, ok: true };
  const cleaned = String(raw).replace(/,/g, '').replace(/원/g, '').replace(/\s/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? { val: 0, ok: false } : { val: n, ok: true };
}

/**
 * @returns {{ ok, error?, colMap, success[], failed[] }}
 */
export function parseShipmentRows(headers, rows) {
  const headerMap = {};
  headers.forEach(h => {
    headerMap[normH(h)] = h;
  });
  const normHeaders = Object.keys(headerMap);

  const colMap = {};
  for (const [key, candidates] of Object.entries(COL_CANDIDATES)) {
    const normCands = candidates.map(normH);
    const matched = normHeaders.find(n => normCands.includes(n));
    colMap[key] = matched != null ? headerMap[matched] : null;
  }

  for (const req of REQUIRED_COLS) {
    if (!colMap[req]) {
      return {
        ok: false,
        error: `필수 컬럼을 찾을 수 없습니다: ${REQUIRED_LABELS[req]}`,
        colMap,
        success: [],
        failed: [],
      };
    }
  }

  const success = [];
  const failed = [];

  rows.forEach((row, idx) => {
    const productName = String(row[colMap.productName] ?? '').trim();
    const productCode = String(row[colMap.productCode] ?? '').trim();
    if (!productName && !productCode) return;

    const qtyRes = tryNum(row[colMap.quantity]);
    const amtRes = tryNum(row[colMap.amount]);

    if (!qtyRes.ok) {
      failed.push({
        rowIndex: idx + 2,
        productCode,
        productName,
        reason: '배송수량 인식 실패',
        raw: String(row[colMap.quantity] ?? ''),
      });
      return;
    }
    if (!amtRes.ok) {
      failed.push({
        rowIndex: idx + 2,
        productCode,
        productName,
        reason: '합계 인식 실패',
        raw: String(row[colMap.amount] ?? ''),
      });
      return;
    }

    // 정책: 부가세포함가는 출고량에서 계산하지 않음 — 제때 가격 비교의 productCode lookup이 단일 진실 소스
    const unitPrice = colMap.unitPrice ? tryNum(row[colMap.unitPrice]).val : 0;
    const vatAmount = colMap.vatAmount ? tryNum(row[colMap.vatAmount]).val : 0;
    const taxType = colMap.taxType ? String(row[colMap.taxType] ?? '').trim() : '';

    success.push({
      productCode,
      productName,
      normalizedProductName: normalizeProductName(productName),
      unit: colMap.unit ? String(row[colMap.unit] ?? '').trim() : '',
      temperature: colMap.temperature ? String(row[colMap.temperature] ?? '').trim() : '',
      taxType,
      quantity: qtyRes.val,
      unitPrice,
      vatAmount,
      amount: amtRes.val,
      matchStatus: 'matched_basic',
      errorReason: '',
    });
  });

  return { ok: true, colMap, success, failed };
}

/**
 * 70개 대상 목록과 매칭되는 행만 필터.
 * 우선순위: productCode 정확일치 > normalizedProductName 정확일치
 */
export function filterTargetRows(rows, managedProducts) {
  const byCode = new Map(managedProducts.filter(p => p.productCode).map(p => [p.productCode, p]));
  const byNorm = new Map(
    managedProducts
      .filter(p => p.normalizedProductName || p.productName)
      .map(p => [p.normalizedProductName || normalizeProductName(p.productName), p])
  );
  return rows.filter(r => {
    if (r.productCode && byCode.has(r.productCode)) return true;
    if (r.normalizedProductName && byNorm.has(r.normalizedProductName)) return true;
    return false;
  });
}
