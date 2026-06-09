/**
 * lib/parse.js — 공통 파싱 함수
 *
 * v2 src/common/parse.js 이식. 외부 의존성 0, 순수 함수만.
 *
 * 사이트 전체에서 사용하는 공통 파싱.
 * 데이터 표준화를 위해 중앙에서 관리하며, 모든 모듈이 동일한 로직 사용을 보장.
 */

/**
 * 숫자 문자열을 파싱하여 정수 또는 소수를 반환.
 * 쉼표, 원 기호, 공백 제거 후 숫자만 추출.
 *
 * @param {*} raw - 파싱할 값 (문자열, 숫자, null 등)
 * @returns {number|null} 성공 시 숫자, 실패 시 null
 */
export function tryParsePrice(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).replace(/[,원\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!isNaN(n)) return n;
  const matched = s.match(/^-?\d+(?:\.\d+)?$/);
  return matched ? Number(matched[0]) : null;
}

/**
 * 선택 입력 숫자를 0 이상의 숫자 또는 null로 정규화.
 * 폼에서 빈칸은 미입력(null)으로 유지하고, 잘못된 값/음수만 명확히 거른다.
 *
 * @param {*} raw
 * @returns {{ ok: true, value: number|null }|{ ok: false, value: null }}
 */
export function parseOptionalNonNegativeNumber(raw) {
  const parsed = parseOptionalNumber(raw);
  if (!parsed.ok || (parsed.value != null && parsed.value < 0)) {
    return { ok: false, value: null };
  }
  return parsed;
}

/**
 * 선택 입력 숫자를 숫자 또는 null로 정규화.
 * 음수를 허용해야 하는 차감 입력 등에 사용한다.
 *
 * @param {*} raw
 * @returns {{ ok: true, value: number|null }|{ ok: false, value: null }}
 */
export function parseOptionalNumber(raw) {
  if (raw == null) return { ok: true, value: null };
  const normalized = String(raw).replace(/,/g, '').trim();
  if (!normalized) return { ok: true, value: null };
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false, value: null };
  return { ok: true, value };
}

/**
 * 과세/면세 구분을 파싱.
 * 면세 계열('면세', '비과세', '과세안함')을 먼저 처리하여 오판 방지.
 *
 * @param {string} raw
 * @returns {'과세'|'면세'|null}
 */
export function parseTaxType(raw) {
  const s = String(raw || '').replace(/\s/g, '');
  if (!s) return null;
  if (s.includes('면세') || s.includes('비과세') || s.includes('과세안함')) return '면세';
  if (s === '과세' || s === '과세품' || s === '부가세과세') return '과세';
  return null;
}

/**
 * 엑셀 날짜 형식을 YYYY-MM-DD로 변환.
 * 지원 형식:
 *   - 엑셀 Serial Number (10000 이상)
 *   - YYYY-MM-DD
 *   - YYYY.MM.DD
 *   - YYYY년 MM월 DD일
 *
 * @param {*} raw
 * @returns {string} YYYY-MM-DD 또는 빈 문자열
 */
export function parseExcelDate(raw) {
  if (raw == null || String(raw).trim() === '') return '';
  const n = Number(raw);
  if (Number.isFinite(n) && n > 10000) {
    const date = new Date((n - 25569) * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{4}\.\d{2}\.\d{2}/.test(s)) return s.slice(0, 10).replace(/\./g, '-');
  const m2 = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return s;
}
