import { jest } from '@jest/globals';
import {
  downloadDateStamp,
  makeFileName,
  printCurrentPageWithDownloadDate,
  withDownloadDateSuffix,
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
