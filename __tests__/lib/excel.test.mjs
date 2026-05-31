import { readCsvFile, detectHeaderRow, matchColumn } from '../../lib/excel.js';

// ─── readCsvFile ──────────────────────────────────────────────────────────────

describe('readCsvFile', () => {
  test('기본 CSV 파싱', () => {
    const text = 'name,price,qty\n사과,1000,5\n배,2000,3';
    const { headers, rows } = readCsvFile(text);
    expect(headers).toEqual(['name', 'price', 'qty']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: '사과', price: '1000', qty: '5' });
  });

  test('UTF-8 BOM 제거', () => {
    const bom = '﻿';
    const text = bom + 'name,price\n아이템,500';
    const { headers } = readCsvFile(text);
    expect(headers[0]).toBe('name');
  });

  test('빈 파일 → headers/rows/rawRows 모두 빈 배열', () => {
    const { headers, rows, rawRows } = readCsvFile('');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
    expect(rawRows).toEqual([]);
  });

  test('공백만 있는 파일 → 빈 배열', () => {
    const { headers, rows } = readCsvFile('   \n  \n');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  test('큰따옴표 필드 파싱', () => {
    const text = 'name,desc\n"홍길동","쉼표, 포함 설명"';
    const { rows } = readCsvFile(text);
    expect(rows[0].name).toBe('홍길동');
    expect(rows[0].desc).toBe('쉼표, 포함 설명');
  });

  test('따옴표 이스케이프 ("" → ")', () => {
    const text = 'name\n"큰""따옴표"';
    const { rows } = readCsvFile(text);
    expect(rows[0].name).toBe('큰"따옴표');
  });

  test('CRLF 줄바꿈 처리', () => {
    const text = 'a,b\r\n1,2\r\n3,4';
    const { rows } = readCsvFile(text);
    expect(rows).toHaveLength(2);
  });

  test('빈 행은 결과에서 제외', () => {
    const text = 'name,price\n아이템,1000\n\n';
    const { rows } = readCsvFile(text);
    expect(rows).toHaveLength(1);
  });

  test('rawRows는 헤더 포함 전체 행 반환', () => {
    const text = 'a,b\n1,2\n3,4';
    const { rawRows } = readCsvFile(text);
    expect(rawRows).toHaveLength(3);
  });
});

// ─── detectHeaderRow ──────────────────────────────────────────────────────────

describe('detectHeaderRow', () => {
  test('첫 행이 헤더인 경우 → 0 반환', () => {
    const rows = [['name', 'price', 'qty'], ['a', '1', '2']];
    expect(detectHeaderRow(rows)).toBe(0);
  });

  test('비어있는 첫 행이 있으면 건너뜀', () => {
    const rows = [['', ''], ['name', 'price', 'qty'], ['a', '1', '2']];
    expect(detectHeaderRow(rows)).toBe(1);
  });

  test('빈 배열 → 0 반환 (기본값)', () => {
    expect(detectHeaderRow([])).toBe(0);
  });

  test('비어있지 않은 셀이 3개 미만인 행은 건너뜀', () => {
    const rows = [['a', 'b'], ['c', 'd', 'e', 'f']];
    expect(detectHeaderRow(rows)).toBe(1);
  });
});

// ─── matchColumn ─────────────────────────────────────────────────────────────

describe('matchColumn', () => {
  const headers = ['상품명', '판매가', '수량'];

  test('첫 번째 일치 후보 반환', () => {
    expect(matchColumn(headers, ['판매가', 'price'])).toBe('판매가');
  });

  test('두 번째 후보가 일치하는 경우', () => {
    expect(matchColumn(headers, ['price', '판매가'])).toBe('판매가');
  });

  test('일치하는 후보 없으면 null', () => {
    expect(matchColumn(headers, ['없는컬럼', 'unknown'])).toBeNull();
  });

  test('빈 후보 배열 → null', () => {
    expect(matchColumn(headers, [])).toBeNull();
  });

  test('빈 헤더 배열 → null', () => {
    expect(matchColumn([], ['판매가'])).toBeNull();
  });
});
