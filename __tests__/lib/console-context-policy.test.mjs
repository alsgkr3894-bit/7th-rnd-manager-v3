import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);
const RAW_CONSOLE_ERROR_PATTERN = /console\.(?:error|warn)\(\s*(?:err|e)\s*\)/;

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

describe('console context policy', () => {
  test('error and warning logs include a short context label', () => {
    const offenders = ROOTS.flatMap(root => collectSourceFiles(root))
      .filter(file => RAW_CONSOLE_ERROR_PATTERN.test(readFileSync(file, 'utf8')))
      .map(file => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
