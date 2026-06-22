import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const SOURCE_ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

const ALLOWED_FETCH_FILES = new Set(['lib/session.js']);
const ALLOWED_DANGEROUS_HTML_FILES = new Set(['app/layout.jsx']);
const ALLOWED_PRINT_WINDOW_FILES = new Set(['lib/print/window-print.js']);
const ALLOWED_OBJECT_URL_FILES = new Set(['lib/download.js', 'lib/image/resize.js']);

function listSourceFiles(dir) {
  return readdirSync(dir)
    .flatMap(name => {
      const fullPath = join(dir, name);
      if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
      return SOURCE_EXTENSIONS.has(extname(fullPath)) ? [fullPath] : [];
    })
    .sort();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function findMatches(regex) {
  const files = SOURCE_ROOTS.flatMap(root => listSourceFiles(resolve(root)));
  const matches = [];

  for (const filePath of files) {
    const file = filePath.replace(`${resolve('.')}/`, '');
    const source = readFileSync(filePath, 'utf8');
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      matches.push({ file, line: lineNumberAt(source, match.index), text: match[0] });
    }
  }

  return matches.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
}

function unexpectedFiles(matches, allowedFiles) {
  return matches
    .filter(match => !allowedFiles.has(match.file))
    .map(match => ({ file: match.file, line: match.line, text: match.text }));
}

describe('browser API policy', () => {
  test('앱 런타임 fetch는 공인 IP 수동 조회 모듈에만 둔다', () => {
    const unexpected = unexpectedFiles(findMatches(/\bfetch\s*\(/g), ALLOWED_FETCH_FILES);

    expect(unexpected).toEqual([]);
  });

  test('eval, new Function, 문자열 timer는 앱 소스에서 금지한다', () => {
    expect(findMatches(/\beval\s*\(/g)).toEqual([]);
    expect(findMatches(/\bnew\s+Function\s*\(/g)).toEqual([]);
    expect(findMatches(/\bset(?:Timeout|Interval)\s*\(\s*['"`]/g)).toEqual([]);
  });

  test('문자열 HTML 주입과 인쇄창 API는 지정된 helper에만 둔다', () => {
    expect(
      unexpectedFiles(findMatches(/dangerouslySetInnerHTML/g), ALLOWED_DANGEROUS_HTML_FILES)
    ).toEqual([]);
    expect(
      unexpectedFiles(findMatches(/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML/g), new Set())
    ).toEqual([]);
    expect(
      unexpectedFiles(
        findMatches(/\bwindow\.open\s*\(|\bdocument\.write\s*\(/g),
        ALLOWED_PRINT_WINDOW_FILES
      )
    ).toEqual([]);
  });

  test('object URL 생성/해제는 다운로드와 이미지 리사이즈 helper에만 둔다', () => {
    const objectUrlMatches = findMatches(/\bURL\.(?:createObjectURL|revokeObjectURL)\s*\(/g);

    expect(unexpectedFiles(objectUrlMatches, ALLOWED_OBJECT_URL_FILES)).toEqual([]);
  });
});
