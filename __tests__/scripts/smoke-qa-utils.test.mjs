import {
  cell,
  isNextStaticAsset404,
  isSmokePass,
  resourcePathOf,
  splitConsoleErrors,
} from '../../scripts/smoke-qa-utils.mjs';

const failedResource404 =
  'Failed to load resource: the server responded with a status of 404 (Not Found)';

describe('smoke-qa-utils', () => {
  test('resourcePathOf는 URL에서 path와 query만 추출한다', () => {
    expect(resourcePathOf('http://localhost:3000/_next/static/chunks/main.js?v=1')).toBe(
      '/_next/static/chunks/main.js?v=1'
    );
    expect(resourcePathOf('/plain/path')).toBe('/plain/path');
  });

  test('isNextStaticAsset404는 Next 정적 리소스 404만 허용 후보로 본다', () => {
    expect(isNextStaticAsset404('http://localhost:3000/_next/static/chunks/main.js', 404)).toBe(
      true
    );
    expect(isNextStaticAsset404('http://localhost:3000/api/missing', 404)).toBe(false);
    expect(isNextStaticAsset404('http://localhost:3000/_next/static/chunks/main.js', 500)).toBe(
      false
    );
  });

  test('splitConsoleErrors는 Next dev 정적 청크 404 개수만큼만 generic console 404를 무시한다', () => {
    const result = splitConsoleErrors([failedResource404, failedResource404, 'PAGEERROR: boom'], {
      ignorableNextStatic404Count: 1,
    });

    expect(result.ignored).toEqual([failedResource404]);
    expect(result.relevant).toEqual([failedResource404, 'PAGEERROR: boom']);
  });

  test('splitConsoleErrors는 일반 런타임 오류를 무시하지 않는다', () => {
    expect(
      splitConsoleErrors(['TypeError: x is not a function'], {
        ignorableNextStatic404Count: 3,
      }).relevant
    ).toEqual(['TypeError: x is not a function']);
  });

  test('isSmokePass는 h1/main과 오류 상태를 함께 판단한다', () => {
    expect(
      isSmokePass({
        h1: true,
        main: true,
        overflow: false,
        loading: false,
        errText: false,
        errs: 0,
      })
    ).toBe(true);
    expect(
      isSmokePass({
        h1: true,
        main: true,
        overflow: false,
        loading: false,
        errText: false,
        errs: 1,
      })
    ).toBe(false);
    expect(cell(true)).toBe('Y');
    expect(cell(false)).toBe('·');
  });
});
