/**
 * 업로드 공통 정책 테스트 (9단계)
 * - 크기/확장자 상수 존재 확인
 * - checkFileSize / checkFileExt 동작 확인
 * - 주요 업로드 모듈이 upload-policy를 import하는지 구조 확인
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { UPLOAD_MAX_MB, UPLOAD_EXT, checkFileSize, checkFileExt } from '../../lib/upload-policy.js';

function src(path) {
  return readFileSync(resolve(path), 'utf-8');
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

describe('UPLOAD_MAX_MB 상수', () => {
  test('excel, jette, backup, photo 키가 모두 있다', () => {
    expect(typeof UPLOAD_MAX_MB.excel).toBe('number');
    expect(typeof UPLOAD_MAX_MB.jette).toBe('number');
    expect(typeof UPLOAD_MAX_MB.backup).toBe('number');
    expect(typeof UPLOAD_MAX_MB.photo).toBe('number');
  });

  test('jette >= excel (대용량 허용)', () => {
    expect(UPLOAD_MAX_MB.jette).toBeGreaterThanOrEqual(UPLOAD_MAX_MB.excel);
  });

  test('backup >= jette (백업은 가장 큼)', () => {
    expect(UPLOAD_MAX_MB.backup).toBeGreaterThanOrEqual(UPLOAD_MAX_MB.jette);
  });
});

describe('UPLOAD_EXT 상수', () => {
  test('excelOrCsv에 xlsx, xls, csv가 포함된다', () => {
    expect(UPLOAD_EXT.excelOrCsv).toContain('.xlsx');
    expect(UPLOAD_EXT.excelOrCsv).toContain('.xls');
    expect(UPLOAD_EXT.excelOrCsv).toContain('.csv');
  });

  test('json에 .json이 포함된다', () => {
    expect(UPLOAD_EXT.json).toContain('.json');
  });
});

// ── checkFileSize ─────────────────────────────────────────────────────────────

describe('checkFileSize', () => {
  function makeFile(size) {
    return { size, name: 'test.xlsx' };
  }

  test('빈 파일(0바이트)은 오류 메시지를 반환한다', () => {
    expect(checkFileSize(makeFile(0), 20)).toBeTruthy();
  });

  test('크기 미만이면 null을 반환한다', () => {
    expect(checkFileSize(makeFile(10 * 1024 * 1024), 20)).toBeNull();
  });

  test('크기 초과이면 최대 크기를 포함한 메시지를 반환한다', () => {
    const msg = checkFileSize(makeFile(25 * 1024 * 1024), 20);
    expect(msg).toBeTruthy();
    expect(msg).toContain('20MB');
  });

  test('정확히 최대 크기이면 null을 반환한다', () => {
    expect(checkFileSize(makeFile(20 * 1024 * 1024), 20)).toBeNull();
  });
});

// ── checkFileExt ──────────────────────────────────────────────────────────────

describe('checkFileExt', () => {
  function makeFile(name) {
    return { size: 1000, name };
  }

  test('허용 확장자 파일은 null을 반환한다', () => {
    expect(checkFileExt(makeFile('data.xlsx'), UPLOAD_EXT.excelOrCsv)).toBeNull();
    expect(checkFileExt(makeFile('DATA.CSV'), UPLOAD_EXT.excelOrCsv)).toBeNull();
    expect(checkFileExt(makeFile('backup.json'), UPLOAD_EXT.json)).toBeNull();
  });

  test('미허용 확장자는 허용 목록을 포함한 메시지를 반환한다', () => {
    const msg = checkFileExt(makeFile('data.txt'), UPLOAD_EXT.excelOrCsv);
    expect(msg).toBeTruthy();
    expect(msg).toContain('.xlsx');
  });

  test('확장자 검사는 대소문자를 구분하지 않는다', () => {
    expect(checkFileExt(makeFile('data.XLSX'), UPLOAD_EXT.excel)).toBeNull();
  });
});

// ── 업로드 모듈 구조 확인 ──────────────────────────────────────────────────────

describe('주요 업로드 모듈 — upload-policy import 여부', () => {
  test('use-shipment.js가 UPLOAD_MAX_MB를 import한다', () => {
    const s = src('lib/shipment/use-shipment.js');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('upload-policy');
  });

  test('use-price-upload.js가 UPLOAD_MAX_MB를 import한다', () => {
    const s = src('lib/price/use-price-upload.js');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('upload-policy');
  });

  test('MenuPriceUploadCard.jsx가 UPLOAD_MAX_MB를 import한다', () => {
    const s = src('components/cost/menu-price/MenuPriceUploadCard.jsx');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('upload-policy');
  });

  test('파싱 실패 폴백이 "파싱 실패" 두 글자로 끝나지 않는다', () => {
    const shipment = src('lib/shipment/use-shipment.js');
    const price = src('lib/price/use-price-upload.js');
    // "파싱 실패" 단독 문자열이 toast 폴백으로 남아 있으면 안 됨
    expect(shipment).not.toContain("|| '파싱 실패'");
    expect(price).not.toContain("|| '파싱 실패'");
  });
});
