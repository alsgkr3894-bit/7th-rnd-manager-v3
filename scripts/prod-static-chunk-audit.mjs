import { readFileSync, writeFileSync } from 'node:fs';

const BASE = (process.env.BASE || process.env.QA_BASE || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const OUT = process.env.PROD_STATIC_AUDIT_OUT || 'docs/prod-static-chunk-audit-2026-07-02.json';

const manifest = JSON.parse(readFileSync('.next/app-build-manifest.json', 'utf8'));
const byAsset = new Map();

for (const [page, assets] of Object.entries(manifest.pages || {})) {
  for (const asset of assets || []) {
    if (!asset.startsWith('static/') || !asset.endsWith('.js')) continue;
    if (!byAsset.has(asset)) byAsset.set(asset, new Set());
    byAsset.get(asset).add(page);
  }
}

async function checkAsset(asset, pages) {
  const url = `${BASE}/_next/${asset}`;
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    const body = await response.arrayBuffer();
    return {
      asset,
      url,
      status: response.status,
      contentType,
      bytes: body.byteLength,
      ok: response.status === 200 && /javascript/i.test(contentType),
      pages: [...pages].sort(),
    };
  } catch (error) {
    return {
      asset,
      url,
      status: null,
      contentType: '',
      bytes: 0,
      ok: false,
      error: error?.message || String(error),
      pages: [...pages].sort(),
    };
  }
}

const results = [];
for (const [asset, pages] of [...byAsset.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  results.push(await checkAsset(asset, pages));
}

const problems = results.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  counts: {
    total: results.length,
    ok: results.length - problems.length,
    problems: problems.length,
  },
  problems,
  results,
};

writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Production static chunk audit: ${report.counts.ok}/${report.counts.total} ok`);
console.log(`Result file: ${OUT}`);
for (const problem of problems.slice(0, 20)) {
  console.log(`- HTTP ${problem.status ?? 'ERR'} ${problem.asset}`);
  console.log(`  pages: ${problem.pages.slice(0, 8).join(', ')}`);
}

if (problems.length > 0) process.exitCode = 1;
