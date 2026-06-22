/**
 * 업로드 공통 정책 테스트 (9단계)
 * - 크기/확장자 상수 존재 확인
 * - checkFileSize / checkFileExt 동작 확인
 * - 주요 업로드 모듈이 upload-policy를 import하는지 구조 확인
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  UPLOAD_MAX_MB,
  UPLOAD_EXT,
  checkFileSize,
  checkFileExt,
  parseErrorMsg,
} from '../../lib/upload-policy.js';

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
  test('excelOrCsv에 xlsx, xls, csv, tsv가 포함된다', () => {
    expect(UPLOAD_EXT.excelOrCsv).toContain('.xlsx');
    expect(UPLOAD_EXT.excelOrCsv).toContain('.xls');
    expect(UPLOAD_EXT.excelOrCsv).toContain('.csv');
    expect(UPLOAD_EXT.excelOrCsv).toContain('.tsv');
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
    expect(checkFileExt(makeFile('DATA.TSV'), UPLOAD_EXT.excelOrCsv)).toBeNull();
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

// ── parseErrorMsg ────────────────────────────────────────────────────────────

describe('parseErrorMsg', () => {
  test('Error 객체의 메시지를 사용자 안내 문구로 감싼다', () => {
    expect(parseErrorMsg(new Error('시트가 없습니다'))).toBe(
      '파일을 읽을 수 없습니다: 시트가 없습니다'
    );
  });

  test('문자열과 빈 값을 안전하게 처리한다', () => {
    expect(parseErrorMsg('깨진 파일')).toBe('파일을 읽을 수 없습니다: 깨진 파일');
    expect(parseErrorMsg(null)).toBe('파일을 읽을 수 없습니다');
  });

  test('긴 내부 에러 메시지는 100자로 잘라 화면 노이즈를 줄인다', () => {
    const msg = parseErrorMsg(new Error('x'.repeat(120)));
    expect(msg).toHaveLength('파일을 읽을 수 없습니다: '.length + 100);
  });
});

// ── 업로드 모듈 구조 확인 ──────────────────────────────────────────────────────

describe('주요 업로드 모듈 — upload-policy import 여부', () => {
  test('use-shipment.js가 공통 크기/확장자 정책을 hook 레벨에서도 적용한다', () => {
    const s = src('lib/shipment/use-shipment.js');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('checkFileExt');
    expect(s).toContain('upload-policy');
    expect(s).toContain('checkFileExt(file, UPLOAD_EXT.excelOrCsv)');
    expect(s.indexOf('checkFileExt(file, UPLOAD_EXT.excelOrCsv)')).toBeLessThan(
      s.indexOf('checkFileSize(file, UPLOAD_MAX_MB.jette)')
    );
  });

  test('use-shipment.js는 공유 버퍼 파서를 await해 xlsx 업로드를 처리한다', () => {
    const s = src('lib/shipment/use-shipment.js');
    expect(s).toContain('await readSpreadsheetFromBuffer(buffer, file.name)');
  });

  test('use-price-upload.js가 공통 크기/확장자 정책을 hook 레벨에서도 적용한다', () => {
    const s = src('lib/price/use-price-upload.js');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('checkFileExt');
    expect(s).toContain('upload-policy');
    expect(s).toContain('checkFileExt(file, UPLOAD_EXT.excelOrCsv)');
    expect(s.indexOf('checkFileExt(file, UPLOAD_EXT.excelOrCsv)')).toBeLessThan(
      s.indexOf('checkFileSize(file, UPLOAD_MAX_MB.jette)')
    );
  });

  test('판매량 업로드는 CSV를 file.text()로 직접 읽지 않고 공통 스프레드시트 파서를 쓴다', () => {
    const s = src('lib/sales/use-sales-upload.js');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('checkFileExt(file, UPLOAD_EXT.excelOrCsv)');
    expect(s).toContain('checkFileSize(file, UPLOAD_MAX_MB.excel)');
    expect(s).toContain('readSpreadsheetFile');
    expect(s).toContain('await readSpreadsheetFile(file)');
    expect(s).not.toContain('file.text()');
  });

  test('판매량 업로드 Dropzone도 공통 업로드 정책 상수를 사용한다', () => {
    const s = src('components/sales/UploadDropzone.jsx');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('accept={UPLOAD_EXT.excelOrCsv}');
    expect(s).toContain('maxSizeMB={UPLOAD_MAX_MB.excel}');
  });

  test('MenuPriceUploadCard.jsx가 공통 크기/확장자 정책과 실패행 다운로드를 사용한다', () => {
    const s = src('components/cost/menu-price/MenuPriceUploadCard.jsx');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('checkFileSize');
    expect(s).toContain('checkFileExt');
    expect(s).toContain('downloadFailedRows');
    expect(s).toContain('isViewer = false');
    expect(s).toContain('disabled={isViewer}');
    expect(s).toContain('저장할 행이 없습니다');
    expect(s).toContain('preview.failed.length > 0');
    expect(s).toContain('오류 행을 먼저 수정한 뒤 다시 업로드해주세요.');
    expect(s).toContain('오류 행이 있으면 기존 판매가 전체 교체를 진행하지 않습니다.');
    expect(s).toContain('readSpreadsheetFile');
    expect(s).not.toContain('readFileAsText');
    expect(s).toContain('accept=".csv,.tsv,.xlsx,.xls"');
    expect(s).toContain('upload-policy');
  });

  test('UploadDropzone은 공통 확장자/크기 검사를 사용한다', () => {
    const s = src('components/ui/UploadDropzone.jsx');
    expect(s).toContain('checkFileExt');
    expect(s).toContain('checkFileSize');
    expect(s).toContain('disabled={disabled}');
    expect(s).toContain('if (disabled) {');
    expect(s).toContain('upload-policy');
  });

  test('제때 단가/출고량 화면은 30MB 업로드 제한을 dropzone에 전달한다', () => {
    const pricePage = src('app/jette/price-compare/page.jsx');
    const shipmentPage = src('app/jette/shipment/page.jsx');
    expect(pricePage).toContain('maxSizeMB={30}');
    expect(shipmentPage).toContain('maxSizeMB={30}');
  });

  test('영양성분 베이스 import는 dropzone 오류를 파일 존재 검사보다 먼저 처리한다', () => {
    const s = src('components/nutrition/menu/ImportBaseModal.jsx');
    expect(s.indexOf('if (err)')).toBeGreaterThan(-1);
    expect(s.indexOf('if (!file) return')).toBeGreaterThan(-1);
    expect(s.indexOf('if (err)')).toBeLessThan(s.indexOf('if (!file) return'));
    expect(s).toContain('parseErrorMsg');
  });

  test('영양성분 베이스 import 업로드 step은 Excel 정책 상수를 명시적으로 전달한다', () => {
    const s = src('components/nutrition/menu/import-base/ImportBaseUploadStep.jsx');
    expect(s).toContain('UPLOAD_EXT');
    expect(s).toContain('UPLOAD_MAX_MB');
    expect(s).toContain('accept={UPLOAD_EXT.excel}');
    expect(s).toContain('maxSizeMB={UPLOAD_MAX_MB.excel}');
  });

  test('파싱 실패 폴백이 "파싱 실패" 두 글자로 끝나지 않는다', () => {
    const shipment = src('lib/shipment/use-shipment.js');
    const price = src('lib/price/use-price-upload.js');
    // "파싱 실패" 단독 문자열이 toast 폴백으로 남아 있으면 안 됨
    expect(shipment).not.toContain("|| '파싱 실패'");
    expect(price).not.toContain("|| '파싱 실패'");
  });
});
