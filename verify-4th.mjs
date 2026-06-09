import { readFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './scripts/qa-browser-utils.mjs';

const B = getQaBase();
const results = [];
const log = (icon, label, msg) => {
  console.log(`${icon} [${label}] ${msg}`);
  results.push(icon);
};

function sourceIncludes(path, ...tokens) {
  const src = readFileSync(path, 'utf8');
  return tokens.every(token => src.includes(token));
}

const browser = await chromium.launch({ headless: true });
const ctx = await newAuthedContext(browser, { viewport: { width: 1280, height: 900 } }, B);

// 1. Section hub pages (4개)
for (const [path] of [
  ['/menu-sales', '메뉴 판매량'],
  ['/ingredient', '식자재'],
  ['/nutrition', '영양성분'],
  ['/jette', '제때'],
]) {
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, path), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  const url = page.url();
  const isHub = url === routeUrl(B, path);
  const cardCount = await page.locator('main .card-lift').count();
  log(
    isHub && cardCount > 0 ? '✅' : '❌',
    `hub:${path}`,
    `URL:${url.replace(B, '')} cards:${cardCount}`
  );
  await page.close();
}

// 2. 최근 방문 위젯 (홈)
{
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem(
      'v3:palette-recent',
      JSON.stringify([
        { href: '/cost/margin', label: '원가마진표', kind: 'nav' },
        { href: '/note', label: '메뉴개발노트', kind: 'nav' },
      ])
    );
  });
  await page.goto(routeUrl(B, '/'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const hasWidget = await page
    .locator('text=최근 방문')
    .isVisible()
    .catch(() => false);
  log(hasWidget ? '✅' : '❌', '홈:최근방문위젯', `위젯 표시: ${hasWidget}`);
  await page.close();
}

// 3. Margin loading state: permanent skeleton 없이 컨텐츠가 렌더링되어야 한다.
{
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, '/cost/margin'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1200);
  const afterLoad = await page.locator('.skeleton').count();
  const hasMain = (await page.locator('main').count()) > 0;
  log(
    hasMain && afterLoad === 0 ? '✅' : '❌',
    'Margin:로딩완료',
    `main:${hasMain} skeleton:${afterLoad}`
  );
  await page.close();
}

// 4. Modal exit animation (ModalFrame)
{
  const ok = sourceIncludes('components/ui/ModalFrame.jsx', 'isClosing', 'handleClose');
  log(ok ? '✅' : '❌', 'ModalFrame:exit애니', `source:${ok}`);
}

// 5. Kanban keyboard nav
{
  const ok = sourceIncludes('app/note/board/page.jsx', 'tabIndex', 'ArrowLeft', 'handleKeyDown');
  log(ok ? '✅' : '❌', '칸반:키보드탐색', `source:${ok}`);
}

// 6. RecipeEditor dynamic import
{
  const ok = sourceIncludes('app/cost/recipe/page.jsx', 'next/dynamic', 'dynamic(');
  log(ok ? '✅' : '❌', 'RecipeEditor:dynamic import', `source:${ok}`);
}

// 7. SampleCard component extraction
{
  const ok =
    sourceIncludes('components/note/SampleCard.jsx', 'SampleCard') &&
    sourceIncludes('app/note/sample/page.jsx', 'SampleCard');
  log(ok ? '✅' : '❌', 'SampleCard:분리', `source:${ok}`);
}

// 8. NoteTableRow React.memo
{
  const ok = sourceIncludes('app/note/_NoteContent.jsx', 'NoteTableRow', 'React.memo');
  log(ok ? '✅' : '❌', 'NoteTableRow:React.memo', `source:${ok}`);
}

// 9. importAll parallel/chunking guard
{
  const ok =
    sourceIncludes('lib/db/operations.js', 'CHUNK') ||
    sourceIncludes('lib/db/operations.js', 'Promise.all');
  log(ok ? '✅' : '❌', 'importAll:병렬화', `source:${ok}`);
}

// 10. 주요 라우트 HTTP 200
for (const path of [
  '/menu-sales',
  '/ingredient',
  '/nutrition',
  '/jette',
  '/cost/recipe',
  '/note/sample',
  '/note/board',
]) {
  const page = await ctx.newPage();
  const response = await page
    .goto(routeUrl(B, path), { waitUntil: 'networkidle', timeout: 12000 })
    .catch(() => null);
  log(
    response?.status() === 200 ? '✅' : '❌',
    `route:${path}`,
    `HTTP ${response?.status() ?? 'ERR'}`
  );
  await page.close();
}

await ctx.close();
await browser.close();

const pass = results.filter(x => x === '✅').length;
const fail = results.filter(x => x === '❌').length;
console.log(`\n총 ${results.length}개 | ✅ ${pass} | ❌ ${fail}`);
if (fail > 0) process.exit(1);
