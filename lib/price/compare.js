/**
 * lib/price/compare.js — 두 날짜 단가 비교 (순수 함수)
 *
 * 매칭 우선순위: 제품코드 > 제품명
 * 상태: 인상 / 인하 / 신규 / 삭제 / 변동없음
 */

const STATUS_ORDER = { '인상': 0, '인하': 1, '신규': 2, '삭제': 3, '변동없음': 4 };

/**
 * @param {object[]} baseRows   기준 날짜 price_rows
 * @param {object[]} latestRows 최신 날짜 price_rows
 * @returns {object[]} diffRows — 상태/변동률 정렬
 */
export function comparePriceLists(baseRows, latestRows) {
  // 최신 rows 인덱싱 (제품코드 / 제품명)
  const byCode = new Map();
  const byName = new Map();
  for (const r of latestRows) {
    if (r.productCode) byCode.set(r.productCode, r);
    if (r.productName) byName.set(r.productName, r);
  }

  const result = [];
  const matchedLatest = new Set();

  // 기준 rows → latest 매칭
  for (const base of baseRows) {
    let latest = null;
    if (base.productCode && byCode.has(base.productCode)) {
      latest = byCode.get(base.productCode);
    } else if (base.productName && byName.has(base.productName)) {
      latest = byName.get(base.productName);
    }

    if (!latest) {
      result.push(makeRow(base, null, '삭제', null, null));
      continue;
    }
    matchedLatest.add(latest);

    const diff = latest.price - base.price;
    const rate = base.price > 0 ? diff / base.price : 0;
    const changeStatus = diff > 0 ? '인상' : diff < 0 ? '인하' : '변동없음';
    result.push(makeRow(base, latest, changeStatus, diff, rate));
  }

  // latest에만 있는 신규 항목
  for (const latest of latestRows) {
    if (!matchedLatest.has(latest)) {
      result.push(makeRow(null, latest, '신규', null, null));
    }
  }

  // 정렬: 상태 우선 → 변동률 절댓값 내림차순
  result.sort((a, b) => {
    const od = (STATUS_ORDER[a.changeStatus] ?? 9) - (STATUS_ORDER[b.changeStatus] ?? 9);
    if (od !== 0) return od;
    return Math.abs(b.changeRate ?? 0) - Math.abs(a.changeRate ?? 0);
  });

  return result;
}

function makeRow(base, latest, changeStatus, changeAmount, changeRate) {
  const src = base ?? latest;
  const cur = latest ?? base;
  return {
    productCode:        src.productCode,
    productName:        src.productName,
    productStatus:      cur.productStatus,
    temperature:        cur.temperature,
    salesUnit:          cur.salesUnit,
    taxType:            cur.taxType,
    basePrice:          base?.price          ?? null,
    latestPrice:        latest?.price        ?? null,
    basePriceWithTax:   base?.priceWithTax   ?? null,
    latestPriceWithTax: latest?.priceWithTax ?? null,
    changeAmount,
    changeRate,
    changeStatus,
  };
}
