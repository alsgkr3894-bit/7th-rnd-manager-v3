import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

function collectSourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectSourceFiles(fullPath, out);
    } else if (/\.(jsx|js)$/.test(name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function findFormButtonsWithoutType(filePath) {
  const source = readFileSync(filePath, 'utf8');
  if (!source.includes('<form') || !source.includes('<button')) return [];

  const misses = [];
  const formRe = /<form\b[\s\S]*?<\/form>/g;
  let formMatch;
  while ((formMatch = formRe.exec(source))) {
    const formBlock = formMatch[0];
    const buttonRe = /<button\b[^>]*>/g;
    let buttonMatch;
    while ((buttonMatch = buttonRe.exec(formBlock))) {
      const openingTag = buttonMatch[0];
      if (/\btype\s*=/.test(openingTag)) continue;
      const absoluteIndex = formMatch.index + buttonMatch.index;
      misses.push({
        file: relative(process.cwd(), filePath),
        line: lineNumberAt(source, absoluteIndex),
        tag: openingTag.replace(/\s+/g, ' ').slice(0, 140),
      });
    }
  }
  return misses;
}

function findImagesWithoutAlt(filePath) {
  const source = readFileSync(filePath, 'utf8');
  if (!source.includes('<img')) return [];

  const misses = [];
  const imgRe = /<img\b[\s\S]*?>/g;
  let imgMatch;
  while ((imgMatch = imgRe.exec(source))) {
    const openingTag = imgMatch[0];
    if (/\balt\s*=/.test(openingTag)) continue;
    misses.push({
      file: relative(process.cwd(), filePath),
      line: lineNumberAt(source, imgMatch.index),
      tag: openingTag.replace(/\s+/g, ' ').slice(0, 140),
    });
  }
  return misses;
}

describe('ui markup safety guards', () => {
  test('buttons inside forms declare explicit type to avoid accidental submit', () => {
    const roots = ['app', 'components'].map(dir => resolve(dir));
    const misses = roots
      .flatMap(root => collectSourceFiles(root))
      .flatMap(file => findFormButtonsWithoutType(file));

    expect(misses).toEqual([]);
  });

  test('image elements declare alt text explicitly', () => {
    const roots = ['app', 'components'].map(dir => resolve(dir));
    const misses = roots
      .flatMap(root => collectSourceFiles(root))
      .flatMap(file => findImagesWithoutAlt(file));

    expect(misses).toEqual([]);
  });
});
