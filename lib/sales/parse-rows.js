/**
 * lib/sales/parse-rows.js — 데이터 행 검증
 *
 * 출력 validRows 필드: { rawMenuName, quantity, originalIndex }
 *   - originalIndex: 1부터 시작 (헤더+1)
 */

function isValidMenuName(value) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

function isValidQuantity(value) {
  if (value == null || value === '') return false;
  const n = Number(value);
  if (isNaN(n)) return false;
  if (!Number.isInteger(n)) return false;
  if (n < 0) return false;
  return true;
}

/**
 * 데이터 행 검증.
 * @returns {
 *   success: true,
 *   totalRows,
 *   validRows: [{ rawMenuName, quantity, originalIndex }, ...],
 *   invalidRows: [{ originalIndex, rawMenuName, quantity, reason }, ...]
 * }
 */
export function parseAndValidateRows(rows, menuColIdx, qtyColIdx) {
  if (!Array.isArray(rows)) {
    return { success: false, reason: '행 데이터가 유효하지 않습니다.' };
  }
  if (rows.length === 0) {
    return { success: false, reason: '데이터 행이 없습니다.' };
  }

  const validRows = [];
  const invalidRows = [];

  rows.forEach((row, idx) => {
    const originalIndex = idx + 2; // 헤더(1) + 데이터 시작(2)

    if (!Array.isArray(row)) {
      invalidRows.push({ originalIndex, rawMenuName: '', quantity: '', reason: '행 형식이 유효하지 않습니다.' });
      return;
    }

    const menuRaw = row[menuColIdx];
    const qtyRaw  = row[qtyColIdx];
    const rawMenuName = menuRaw == null ? '' : String(menuRaw).trim();
    const qtyStr      = qtyRaw  == null ? '' : String(qtyRaw).trim();

    if (!isValidMenuName(menuRaw)) {
      invalidRows.push({
        originalIndex,
        rawMenuName: rawMenuName || '(빈칸)',
        quantity:    qtyStr || '(빈칸)',
        reason: '메뉴명이 비어있거나 공백만 있습니다.',
      });
      return;
    }

    if (!isValidQuantity(qtyRaw)) {
      let reason = '판매량이 유효하지 않습니다.';
      if (qtyStr === '') reason = '판매량이 빈칸입니다.';
      else if (isNaN(Number(qtyStr))) reason = '판매량에 숫자가 아닌 값이 있습니다.';
      else if (!Number.isInteger(Number(qtyStr))) reason = '판매량은 정수만 허용됩니다. (소수 불가)';
      else if (Number(qtyStr) < 0) reason = '판매량은 0 이상이어야 합니다. (음수 불가)';

      invalidRows.push({
        originalIndex,
        rawMenuName,
        quantity: qtyStr || '(빈칸)',
        reason,
      });
      return;
    }

    validRows.push({
      rawMenuName,
      quantity: parseInt(qtyStr, 10),
      originalIndex,
    });
  });

  return { success: true, totalRows: rows.length, validRows, invalidRows };
}
