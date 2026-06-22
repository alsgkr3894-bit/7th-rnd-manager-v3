import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(path), 'utf8');
}

function assertImportOrder(source, before, after) {
  expect(source.indexOf(before)).toBeGreaterThanOrEqual(0);
  expect(source.indexOf(after)).toBeGreaterThanOrEqual(0);
  expect(source.indexOf(before)).toBeLessThan(source.indexOf(after));
}

function blocksFor(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(source.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'g'))).map(
    match => match[1]
  );
}

describe('CSS primitive ownership', () => {
  test('base.css owns shared card/button/input/chip primitives', () => {
    const base = read('app/styles/base.css');

    expect(base).toContain('/* ===== Global Primitives ===== */');
    expect(base).toMatch(/^\.card\s*\{/m);
    expect(base).toMatch(/^\.btn\s*\{/m);
    expect(base).toMatch(/^\.input\s*\{/m);
    expect(base).toMatch(/^\.chip,\n\.filter-chip\s*\{/m);
    expect(base).toMatch(/^\.chip\s*\{/m);
  });

  test('feature and home CSS files do not re-own primitive bodies', () => {
    const homeHero = read('app/styles/components/home-hero.css');
    const homeBody = read('app/styles/components/home-body.css');
    const features = read('app/styles/features.css');

    expect(homeHero).not.toMatch(/^\.card\s*\{/m);
    expect(homeHero).not.toMatch(/^\.btn\s*\{/m);
    expect(homeBody).not.toMatch(/^\.chip,\n\.filter-chip\s*\{/m);
    expect(homeBody).not.toMatch(/^\.chip\s*\{/m);
    expect(features).not.toMatch(/^\.input\s*\{/m);
    expect(features).not.toContain('전역 .input 기본 스타일');
  });

  test('motion CSS only augments button behavior', () => {
    const motionSources = [
      read('app/styles/features/motion.css'),
      read('app/styles/features/motion-note.css'),
      read('app/styles/features/motion-report.css'),
    ].join('\n');

    for (const block of blocksFor(motionSources, '.btn')) {
      expect(block).not.toMatch(/\bdisplay\s*:/);
      expect(block).not.toMatch(/\bpadding\s*:/);
      expect(block).not.toMatch(/\bbackground\s*:/);
      expect(block).not.toMatch(/\bborder-radius\s*:/);
    }
  });

  test('report preview layout is owned by report modal CSS, not motion CSS', () => {
    const reportModal = read('app/styles/features/report/modal.css');
    const motionReport = read('app/styles/features/motion-report.css');

    expect(reportModal).toMatch(/^\.preview-shell\s*\{/m);
    expect(reportModal).toMatch(/^\.preview-body\s*\{/m);
    expect(reportModal).toMatch(/^\.preview-pager\s*\{/m);
    expect(reportModal).toMatch(/^\.pager-btn\s*\{/m);
    expect(reportModal).toMatch(/^\.pager-info\s*\{/m);

    for (const block of blocksFor(motionReport, '.preview-shell')) {
      expect(block).not.toMatch(/\bdisplay\s*:/);
      expect(block).not.toMatch(/\bwidth\s*:/);
      expect(block).not.toMatch(/\bheight\s*:/);
      expect(block).not.toMatch(/\bbackground\s*:/);
      expect(block).not.toMatch(/\boverflow\s*:/);
    }
    expect(motionReport).not.toMatch(/^\.preview-meta\s*\{/m);
    expect(motionReport).not.toMatch(/^\.preview-body\s*\{/m);
    expect(motionReport).not.toMatch(/^\.preview-pager\s*\{/m);
    expect(motionReport).not.toMatch(/^\.pager-btn\s*\{/m);
  });

  test('CSS uses defined surface tokens', () => {
    const styles = [
      read('app/styles/base.css'),
      read('app/styles/layout.css'),
      read('app/styles/features/report/modal.css'),
      read('app/styles/features/motion-report.css'),
      read('app/styles/features/motion-note.css'),
      read('app/styles/features/motion-enhanced.css'),
    ].join('\n');

    expect(styles).not.toContain('var(--surface-1)');
  });

  test('base.css is imported before feature-specific CSS', () => {
    const globals = read('app/globals.css');

    assertImportOrder(globals, './styles/base.css', './styles/components/home-hero.css');
    assertImportOrder(globals, './styles/base.css', './styles/features.css');
    assertImportOrder(globals, './styles/base.css', './styles/features/motion.css');
  });
});
