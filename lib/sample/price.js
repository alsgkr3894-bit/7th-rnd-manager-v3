import { asDisplayText } from '@/lib/ui/prop-guards';

/**
 * 저장된 단가를 숫자로 정규화한다.
 * "12,000", "12000원", "₩12,000", 숫자 12000 등 다양한 형태를 모두 처리한다.
 * 카드/리스트/상세/비교 뷰가 동일한 파싱 규칙을 공유해 표시가 어긋나지 않게 한다.
 * @returns {number|null} 유효한 양수, 아니면 null
 */
export function parseSamplePrice(rec = {}) {
  const raw = asDisplayText(rec?.price).trim();
  if (!raw) return null;
  const num = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * 샘플 단가를 뷰 공통 짧은 포맷으로 표시한다. 유효 양수면 "12,000원"(+별도), 아니면 dash.
 * @param {object} rec - 샘플 레코드({ price, priceTaxType })
 * @param {{ dash?: string }} [options]
 * @returns {string}
 */
export function formatSamplePrice(rec = {}, { dash = '—' } = {}) {
  const num = parseSamplePrice(rec);
  if (num == null) return dash;
  const suffix = rec?.priceTaxType === 'excl' ? '(별도)' : '';
  return `${num.toLocaleString('ko-KR')}원${suffix}`;
}
