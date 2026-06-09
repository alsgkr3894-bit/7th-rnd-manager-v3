import { chromium, getQaBase, newAuthedContext, routeUrl } from './scripts/qa-browser-utils.mjs';

const B = getQaBase();
const results = [];
const log = (icon, label, msg) => {
  console.log(`${icon} [${label}] ${msg}`);
  results.push(icon);
};

const browser = await chromium.launch({ headless: true });
const ctx = await newAuthedContext(browser, { viewport: { width: 1280, height: 900 } }, B);

// 1. 섹션 허브: 대시보드 영역 + 링크 카드 공존 확인
for (const [path, label] of [
  ['/menu-sales', '판매'],
  ['/ingredient', '식자재'],
  ['/jette', '제트'],
  ['/nutrition', '영양'],
]) {
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, path), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1800);

  const navCards = await page.locator('main .card-lift').count();
  const dashboardCards = await page.locator('main > div:first-of-type .card').count();
  const emptyHint =
    (await page.locator('text=업로드').count()) + (await page.locator('text=없어요').count());
  const noSkeleton = (await page.locator('.skeleton').count()) === 0;
  const hasMain = await page.locator('main').count();
  const ok = hasMain > 0 && navCards > 0 && noSkeleton && (dashboardCards > 0 || emptyHint > 0);

  log(
    ok ? '✅' : '❌',
    `hub:${path}`,
    `${label} navCards:${navCards} dashCards:${dashboardCards} emptyHint:${emptyHint} skeletonGone:${noSkeleton}`
  );
  await page.close();
}

// 2. 현재 사이드바는 별도 pill DOM 대신 active class로 현재 위치를 표시한다.
{
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, '/'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1200);
  const activeHome = await page.locator('button.nav-item.active', { hasText: '홈' }).count();
  log(activeHome > 0 ? '✅' : '❌', 'sidebar:active-class', `activeHome:${activeHome}`);
  await page.close();
}

// 3. 본문 전환이 fade-in (slide-up 아님)
{
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, '/menu-sales'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  const anim = await page
    .locator('#main-content')
    .first()
    .evaluate(el => el.style.animation || '');
  const ok = anim.includes('fade-in') && !anim.includes('slide-up');
  log(ok ? '✅' : '❌', 'main:fade-transition', `animation:${anim}`);
  await page.close();
}

// 4. 사이드바 카테고리 클릭은 현재 설계상 이동 없이 아코디언만 펼친다.
{
  const page = await ctx.newPage();
  await page.goto(routeUrl(B, '/'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  await page.locator('button.nav-item', { hasText: '식자재' }).first().click();
  await page.waitForTimeout(300);
  const url = page.url();
  const childCount = await page
    .locator('.nav-children.open .nav-child', { hasText: '식자재' })
    .count();
  const ok = url === routeUrl(B, '/') && childCount > 0;
  log(
    ok ? '✅' : '❌',
    'sidebar:category-toggle',
    `url:${url.replace(B, '')} children:${childCount}`
  );
  await page.close();
}

await ctx.close();
await browser.close();

const pass = results.filter(x => x === '✅').length;
const fail = results.filter(x => x === '❌').length;
console.log(`\n총 ${results.length}개 | ✅ ${pass} | ❌ ${fail}`);
if (fail > 0) process.exit(1);
