import { readFileSync } from 'node:fs';

const filePath = process.argv[2] || 'docs/deep-layout-audit-results-2026-07-02.json';
const report = JSON.parse(readFileSync(filePath, 'utf8'));
const results = report.results || [];
const problems = report.problems || [];

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function pushFindings(result) {
  const findings = [];
  if (result.fatal) findings.push(['fatal', result.fatal]);
  if (result.status >= 500) findings.push(['http-status', String(result.status)]);
  if (!result.h1) findings.push(['missing-h1', 'missing h1']);
  if (!result.main) findings.push(['missing-main', 'missing main']);
  if (result.horizontalOverflow) findings.push(['overflow', `${result.scrollWidth} > ${result.innerWidth}`]);
  for (const item of result.overflowElements || []) findings.push(['overflow-element', item.label]);
  for (const item of result.clippedControls || []) findings.push(['clipped-control', item.label]);
  for (const item of result.overlaps || []) findings.push(['control-overlap', `${item.a} / ${item.b}`]);
  for (const item of result.consoleErrors || []) findings.push(['console-error', item]);
  for (const item of result.pageErrors || []) findings.push(['page-error', item]);
  for (const item of result.httpProblems || []) findings.push(['http-problem', item]);
  for (const item of result.loadingMarkers || []) findings.push(['loading-marker', item]);
  for (const item of result.errorMarkers || []) findings.push(['error-marker', item]);
  return findings;
}

const flatFindings = problems.flatMap(result =>
  pushFindings(result).map(([type, detail]) => ({
    route: result.route,
    brand: result.brand,
    viewport: result.viewport,
    type,
    detail,
  }))
);

console.log(`file: ${filePath}`);
console.log(`generated: ${report.generatedAt}`);
console.log(`base: ${report.base}`);
console.log(`total checks: ${report.counts?.total ?? results.length}`);
console.log(`problem checks: ${report.counts?.problems ?? problems.length}`);
console.log(`clean checks: ${report.counts?.clean ?? results.length - problems.length}`);
console.log(`routes: ${new Set(results.map(result => `${result.brand} ${result.route}`)).size}`);
console.log('');

console.log('finding types:');
for (const [type, count] of countBy(flatFindings, item => item.type)) {
  console.log(`${count}\t${type}`);
}

console.log('');
console.log('top repeated details:');
for (const [detail, count] of countBy(flatFindings, item => `${item.type}: ${item.detail}`).slice(0, 30)) {
  console.log(`${count}\t${detail}`);
}

console.log('');
console.log('routes with non-sidebar/table overflow or runtime findings:');
const routeCandidates = new Map();
for (const finding of flatFindings) {
  const isCommonSidebar = finding.type === 'overflow-element' && finding.detail.startsWith('aside.sidebar');
  const isSkipLink = finding.type === 'clipped-control' && finding.detail.startsWith('a.skip-link');
  if (isCommonSidebar || isSkipLink) continue;
  const key = `${finding.brand} ${finding.route}`;
  if (!routeCandidates.has(key)) routeCandidates.set(key, []);
  routeCandidates.get(key).push(finding);
}
for (const [route, items] of routeCandidates) {
  const summary = countBy(items, item => `${item.viewport} ${item.type}: ${item.detail}`)
    .slice(0, 8)
    .map(([detail, count]) => `${count}x ${detail}`)
    .join(' | ');
  console.log(`${route}\t${summary}`);
}
