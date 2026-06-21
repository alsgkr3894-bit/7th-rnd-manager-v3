import { jest } from '@jest/globals';
import {
  downloadDateStamp,
  makeFileName,
  makeFileNameWithBrand,
  printCurrentPageWithDownloadDate,
  withDownloadDateSuffix,
  downloadFailedRows,
  rowsToCsv,
} from '../../lib/download.js';

describe('download filename date suffix', () => {
  const fixed = new Date(2026, 5, 11, 9, 30, 0);

  test('YYYYMMDD 형식의 다운로드 날짜를 만든다', () => {
    expect(downloadDateStamp(fixed)).toBe('20260611');
  });

  test('확장자 앞 파일명 끝에 날짜를 붙인다', () => {
    expect(withDownloadDateSuffix('원가마진표.csv', fixed)).toBe('원가마진표_20260611.csv');
    expect(withDownloadDateSuffix('제품영양성분표.xlsx', fixed)).toBe(
      '제품영양성분표_20260611.xlsx'
    );
  });

  test('확장자가 없는 PDF 인쇄 제목에도 날짜를 붙인다', () => {
    expect(withDownloadDateSuffix('원산지 표시판', fixed)).toBe('원산지 표시판_20260611');
  });

  test('이미 같은 날짜로 끝나면 중복으로 붙이지 않는다', () => {
    expect(withDownloadDateSuffix('원산지 표시판_20260611', fixed)).toBe('원산지 표시판_20260611');
    expect(withDownloadDateSuffix('원산지 표시판_20260611.xlsx', fixed)).toBe(
      '원산지 표시판_20260611.xlsx'
    );
  });

  test('기존 날짜나 시간 suffix를 정리하고 마지막에 오늘 날짜만 붙인다', () => {
    expect(withDownloadDateSuffix('보고서목록_2026-06-11.xlsx', fixed)).toBe(
      '보고서목록_20260611.xlsx'
    );
    expect(withDownloadDateSuffix('rnd-manager-backup_20260611_143022.json', fixed)).toBe(
      'rnd-manager-backup_20260611.json'
    );
  });

  test('makeFileName은 한글 업무명과 날짜만 포함한다', () => {
    expect(makeFileName('7번가시스템백업', 'json', fixed)).toBe('7번가시스템백업_20260611.json');
    expect(makeFileName('복원용임시백업파일', '.json', fixed)).toBe(
      '복원용임시백업파일_20260611.json'
    );
  });

  test('makeFileNameWithBrand는 브랜드명을 파일명 앞에 붙인다', () => {
    // 테스트 환경(node)에서는 localStorage 없음 → 기본 브랜드 7번가피자 사용
    const result = makeFileNameWithBrand('원가마진표', 'csv', fixed);
    expect(result).toMatch(/^7번가피자_원가마진표_20260611\.csv$/);
  });

  test('makeFileNameWithBrand는 xlsx 확장자도 올바르게 처리한다', () => {
    const result = makeFileNameWithBrand('보고서 목록', 'xlsx', fixed);
    expect(result).toMatch(/^7번가피자_보고서 목록_20260611\.xlsx$/);
  });

  test('현재 페이지 PDF 인쇄 제목에 다운로드 날짜를 붙이고 인쇄 후 원복한다', async () => {
    const previousDocument = global.document;
    const previousWindow = global.window;
    const originalTitle = '기존 제목';
    const observed = {};

    try {
      global.document = { title: originalTitle };
      global.window = {
        addEventListener: jest.fn(),
        print: jest.fn(() => {
          observed.titleAtPrint = global.document.title;
        }),
      };

      printCurrentPageWithDownloadDate('일정 달력', { cleanupDelayMs: 0 });

      expect(observed.titleAtPrint).toBe(`일정 달력_${downloadDateStamp()}`);
      expect(global.window.print).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(global.document.title).toBe(originalTitle);
    } finally {
      global.document = previousDocument;
      global.window = previousWindow;
    }
  });
});

describe('rowsToCsv 수식 인젝션 방지 (R4-M1 회귀)', () => {
  const dataLine = csv => csv.replace(/^﻿/, '').split('\r\n')[1];

  test('수식 트리거 문자로 시작하는 문자열 셀에 작은따옴표를 접두한다', () => {
    expect(dataLine(rowsToCsv([['h'], ['=SUM(A1)']]))).toBe(`'=SUM(A1)`);
    expect(dataLine(rowsToCsv([['h'], ['@cmd']]))).toBe(`'@cmd`);
    expect(dataLine(rowsToCsv([['h'], ['+1+1']]))).toBe(`'+1+1`);
    // 콤마가 포함되면 따옴표로 감싸지며 작은따옴표 접두도 유지된다
    expect(dataLine(rowsToCsv([['h'], ['=HYPERLINK(1,2)']]))).toBe(`"'=HYPERLINK(1,2)"`);
  });

  test('숫자 셀과 숫자 리터럴 문자열은 그대로 둔다(접두 안 함)', () => {
    expect(dataLine(rowsToCsv([['h'], [-5]]))).toBe('-5');
    expect(dataLine(rowsToCsv([['h'], ['-5']]))).toBe('-5');
    expect(dataLine(rowsToCsv([['h'], ['+3.5']]))).toBe('+3.5');
    expect(dataLine(rowsToCsv([['h'], [1000]]))).toBe('1000');
  });

  test('일반 한글/영문 텍스트는 변형하지 않는다', () => {
    expect(dataLine(rowsToCsv([['h'], ['페퍼로니피자']]))).toBe('페퍼로니피자');
  });
});

describe('downloadFailedRows', () => {
  test('업로드 실패 행을 CSV 다운로드하고 셀 살균 경로를 공유한다', async () => {
    jest.useFakeTimers();
    const previousDocument = global.document;
    const previousURL = global.URL;
    const anchor = { click: jest.fn() };
    const observed = {};

    try {
      global.document = {
        createElement: jest.fn(() => anchor),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      };
      global.URL = {
        createObjectURL: jest.fn(blob => {
          observed.blob = blob;
          return 'blob:failed-rows';
        }),
        revokeObjectURL: jest.fn(),
      };

      downloadFailedRows(
        [
          { 행번호: 3, 사유: '=BROKEN()', 메뉴명: '테스트' },
          { 행번호: 4, 추가정보: '뒤쪽 행 전용 필드' },
        ],
        '오류행.csv'
      );

      expect(anchor.download).toMatch(/^오류행_\d{8}\.csv$/);
      expect(anchor.href).toBe('blob:failed-rows');
      expect(anchor.click).toHaveBeenCalledTimes(1);
      const text = await observed.blob.text();
      expect(text.replace(/^﻿/, '')).toContain('행번호,사유,메뉴명,추가정보');
      expect(text).toContain(`'=BROKEN()`);
      expect(text).toContain('뒤쪽 행 전용 필드');

      jest.runOnlyPendingTimers();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:failed-rows');
    } finally {
      global.document = previousDocument;
      global.URL = previousURL;
      jest.useRealTimers();
    }
  });

  test('실패 행이 없으면 다운로드를 만들지 않는다', () => {
    const previousURL = global.URL;

    try {
      global.URL = {
        createObjectURL: jest.fn(),
        revokeObjectURL: jest.fn(),
      };

      downloadFailedRows([], '오류행.csv');

      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    } finally {
      global.URL = previousURL;
    }
  });
});
