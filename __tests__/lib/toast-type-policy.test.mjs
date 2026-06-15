import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);
const LEGACY_TOAST_ERROR_PATTERN = /showToast\s*\((?:(?!showToast\s*\().)*?,\s*(['"])err\1/s;

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
  test('call sites use canonical error toast type', () => {
    const offenders = ROOTS.flatMap(root => collectSourceFiles(root))
      .filter(file => relative(process.cwd(), file) !== 'components/Toast.jsx')
      .filter(file => LEGACY_TOAST_ERROR_PATTERN.test(readFileSync(file, 'utf8')))
      .map(file => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
