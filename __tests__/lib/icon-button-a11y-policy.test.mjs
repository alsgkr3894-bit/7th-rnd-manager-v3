/**
 * 접근성 정책(Lighthouse "Buttons do not have an accessible name", 2026-09-29):
 * 아이콘만 든 <button>은 스크린 리더가 "버튼"이라고만 읽는다. aria-label(또는 title)이 있어야 한다.
 * JSX를 실제로 구문 분석해서 찾는다(정규식은 여러 줄 태그를 못 다룬다).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, sep } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const require = createRequire(import.meta.url);
const parser = require('next/dist/compiled/babel/parser');

const SKIP = new Set(['node_modules', '.next', '.next-sandbox', '.git', 'coverage']);

function jsxFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) jsxFiles(full, out);
    else if (entry.name.endsWith('.jsx')) out.push(full);
  }
  return out;
}

function tagName(node) {
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') return `${tagName(node.object)}.${node.property.name}`;
  return '';
}

const isIcon = name =>
  name === 'svg' || name === 'Icon' || name.startsWith('Icon.') || name.endsWith('Icon');

function hasName(el) {
  return el.openingElement.attributes.some(
    attr =>
      attr.type === 'JSXSpreadAttribute' ||
      (attr.type === 'JSXAttribute' &&
        ['aria-label', 'aria-labelledby', 'title'].includes(attr.name.name))
  );
}

/** 자식이 아이콘뿐(텍스트·다른 요소·동적 내용 없음)이면 true */
function isIconOnly(el) {
  let icon = false;
  for (const child of el.children) {
    if (child.type === 'JSXText') {
      if (child.value.trim()) return false;
    } else if (child.type === 'JSXElement' && isIcon(tagName(child.openingElement.name))) {
      icon = true;
    } else {
      return false;
    }
  }
  return icon;
}

function collectButtons(node, found) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'JSXElement' && tagName(node.openingElement.name) === 'button') {
    if (!hasName(node) && isIconOnly(node)) found.push(node.loc.start.line);
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const value = node[key];
    if (Array.isArray(value)) value.forEach(child => collectButtons(child, found));
    else if (value && typeof value.type === 'string') collectButtons(value, found);
  }
}

describe('아이콘 전용 버튼은 접근 가능한 이름을 가진다', () => {
  test('앱 전체 .jsx에 이름 없는 아이콘 전용 <button>이 없다', () => {
    const offenders = [];
    for (const file of jsxFiles('.')) {
      let ast;
      try {
        ast = parser.parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
      } catch {
        continue; // 파싱 못 하는 파일은 lint가 잡는다
      }
      const lines = [];
      collectButtons(ast.program, lines);
      for (const line of lines) offenders.push(`${file.split(sep).join('/')}:${line}`);
    }
    expect(offenders).toEqual([]);
  });

  test('검사기 자체가 동작한다 — 이름 없는 아이콘 버튼은 잡고, 이름/텍스트가 있으면 통과', () => {
    const scan = code => {
      const found = [];
      collectButtons(parser.parse(code, { sourceType: 'module', plugins: ['jsx'] }).program, found);
      return found;
    };
    expect(scan('const a = <button><Icon.trash /></button>;')).toHaveLength(1);
    expect(scan('const a = <button aria-label="삭제"><Icon.trash /></button>;')).toHaveLength(0);
    expect(scan('const a = <button title="삭제"><Icon.trash /></button>;')).toHaveLength(0);
    expect(scan('const a = <button><Icon.trash /> 삭제</button>;')).toHaveLength(0);
  });
});
