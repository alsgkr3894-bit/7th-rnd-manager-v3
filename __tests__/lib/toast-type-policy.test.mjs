import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);
const LEGACY_TOAST_ERROR_PATTERN = /showToast\s*\((?:(?!showToast\s*\().)*?,\s*(['"])err\1/s;
const NEGATIVE_TOAST_WORDS = '실패|입력|필요|없습니다|없어요|초과|차단|위험|권한|불가';
const NEGATIVE_TOAST_LITERAL = [
  String.raw`'[^']*(?:${NEGATIVE_TOAST_WORDS})[^']*'`,
  String.raw`"[^"]*(?:${NEGATIVE_TOAST_WORDS})[^"]*"`,
  String.raw`\x60[^\x60]*(?:${NEGATIVE_TOAST_WORDS})[^\x60]*\x60`,
].join('|');
const SIMPLE_CONCAT_EXPRESSION = String.raw`\s*\+\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*`;
const NEGATIVE_TOAST_WITHOUT_TYPE_PATTERN = new RegExp(
  String.raw`showToast\s*\(\s*(?:(?:${NEGATIVE_TOAST_LITERAL})(?:${SIMPLE_CONCAT_EXPRESSION})?)\s*\)`,
  's'
);

function collectSourceFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (SOURCE_EXTENSIONS.has(extname(path))) {
      files.push(path);
    }
  }

  return files;
}

describe('toast type policy', () => {
  const sourceFiles = ROOTS.flatMap(root => collectSourceFiles(root)).filter(
    file => relative(process.cwd(), file) !== 'components/Toast.jsx'
  );

  test('call sites use canonical error toast type', () => {
    const offenders = sourceFiles
      .filter(file => LEGACY_TOAST_ERROR_PATTERN.test(readFileSync(file, 'utf8')))
      .map(file => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  test('negative toast messages declare an explicit non-success type', () => {
    const offenders = sourceFiles
      .filter(file => NEGATIVE_TOAST_WITHOUT_TYPE_PATTERN.test(readFileSync(file, 'utf8')))
      .map(file => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
