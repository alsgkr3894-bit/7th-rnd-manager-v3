import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const SOURCE_ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

const ALLOWED_INDEXED_DB_OPEN_FILES = new Set(['lib/db/init.js']);
const ALLOWED_INDEXED_DB_DELETE_FILES = new Set(['lib/db/crud.js']);

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

function findDirectIndexedDbCalls(regex) {
  const files = SOURCE_ROOTS.flatMap(root => listSourceFiles(resolve(root)));
  const matches = [];

  for (const filePath of files) {
    const file = filePath.replace(`${resolve('.')}/`, '');
    const source = readFileSync(filePath, 'utf8');
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      matches.push({ file, line: lineNumberAt(source, match.index) });
    }
  }

  return matches.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
}

describe('storage access policy', () => {
  test('앱 소스의 IndexedDB open은 lib/db/init.js를 통해서만 수행한다', () => {
    const unexpected = findDirectIndexedDbCalls(/\bindexedDB\s*\.\s*open\s*\(/g).filter(
      match => !ALLOWED_INDEXED_DB_OPEN_FILES.has(match.file)
    );

    expect(unexpected).toEqual([]);
  });

  test('앱 소스의 deleteDatabase는 lib/db/crud.js wrapper에만 둔다', () => {
    const unexpected = findDirectIndexedDbCalls(/\bindexedDB\s*\.\s*deleteDatabase\s*\(/g).filter(
      match => !ALLOWED_INDEXED_DB_DELETE_FILES.has(match.file)
    );

    expect(unexpected).toEqual([]);
  });
});
