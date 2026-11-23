import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const ERROR_BOUNDARIES = ['app/error.jsx', 'app/global-error.jsx', 'app/_shared/RouteError.jsx'];

describe('오류 화면 내부정보 노출 방지', () => {
  test.each(ERROR_BOUNDARIES)('%s는 원본 오류 메시지를 화면에 출력하지 않는다', file => {
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/\{\s*error(?:\?\.)?\.message\s*\}/);
    expect(source).not.toContain('wordBreak: \'break-all\'');
  });

  test('DB API 실패 응답은 내부 오류 객체 대신 일반 안내문을 반환한다', () => {
    for (const file of [
      'app/api/db/health/route.js',
      'app/api/db/backups/route.js',
      'app/api/db/store-rows/route.js',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/Response\.json\([\s\S]{0,180}error:\s*(?:error|err)(?:\.|\b)/);
    }
  });
});
