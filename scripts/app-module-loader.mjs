/**
 * scripts/app-module-loader.mjs — 점검 스크립트가 앱 코드를 그대로 불러오게 한다
 * ('@/' 별칭과 확장자 없는 상대 import를 Node가 읽을 수 있게 하는 resolve 훅)
 */
import { register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function createAppImporter(root) {
  const hook = `
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = ${JSON.stringify(root)};
const tryFile = base => [base, base + '.js', base + '.mjs', path.join(base, 'index.js')].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !context.parentURL.includes('node_modules')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const file = base && tryFile(base);
  if (file) return next(pathToFileURL(file).href, context);
  return next(specifier, context);
}
`;
  register('data:text/javascript,' + encodeURIComponent(hook), pathToFileURL(root + path.sep));
  return relative => import(pathToFileURL(path.join(root, relative)).href);
}
