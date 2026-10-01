/**
 * 실제 SheetJS로 날짜 셀을 읽어도 하루 밀리지 않는다(2026-09-30 점검: 법인카드 1일 사용분이 전월로 집계).
 * SheetJS는 1899-12-30 기준으로 로컬 시간대를 보정하는데 서울의 그 시절 오프셋(LMT)이 지금과 달라
 * 날짜 셀(자정)이 전날 23:59:08로 온다. 이 문제는 TZ=Asia/Seoul에서만 재현된다 — 아래에서 확인.
 */
import { describe, expect, test } from '@jest/globals';
import * as XLSXNS from 'xlsx';
import { parseExcelDate } from '../../lib/parse.js';

const XLSX = XLSXNS.default || XLSXNS;

function readDateCell(serial) {
  const ws = { A1: { t: 'n', v: serial, z: 'yyyy-mm-dd' }, '!ref': 'A1' };
  const wb = { SheetNames: ['s'], Sheets: { s: ws } };
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const read = XLSX.read(buf, { type: 'buffer', cellDates: true });
  return read.Sheets.s.A1.v;
}

describe('엑셀 날짜 셀 → YYYY-MM-DD', () => {
  // 45779 = 2025-05-02, 45778 = 2025-05-01, 46082 = 2026-03-01(월 경계), 46022 = 2025-12-31
  test.each([
    [45778, '2025-05-01'],
    [45779, '2025-05-02'],
    [46082, '2026-03-01'],
    [46022, '2025-12-31'],
  ])('시리얼 %s → %s', (serial, expected) => {
    expect(parseExcelDate(readDateCell(serial))).toBe(expected);
  });

  test('월 첫날은 전월로 새지 않는다', () => {
    expect(parseExcelDate(readDateCell(46082)).slice(0, 7)).toBe('2026-03');
  });
});
