import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3003';
const r = [];
const log = (icon, lbl, msg) => { console.log(`${icon} [${lbl}] ${msg}`); r.push(icon); };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// 1. 각 섹션 허브: 대시보드 영역(스켈레톤→카드/빈상태) + 링크 카드 공존 확인
for (const [path, label] of [
  ['/menu-sales', '판매'],
  ['/ingredient', '식자재'],
  ['/jette', '제트'],
  ['/nutrition', '영양'],
]) {
  const p = await ctx.newPage();
  await p.goto(`${B}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1800); // useEffect 로드 + 상태 반영 대기

  const navCards = await p.locator('.card-lift').count();
  // 대시보드: stat 카드(.card 안 22px value) 또는 빈 안내 문구 또는 스켈레톤
  const hasStat = await p.locator('main > div:first-of-type .card').count();
  const hasEmptyHint = await p.locator('text=업로드').count() + await p.locator('text=없어요').count();
  const noSkeleton = await p.locator('.skeleton').count() === 0;
  const ok = navCards > 0 && noSkeleton && (hasStat > 0 || hasEmptyHint > 0);
  log(ok ? '✅' : '❌', `hub:${path}`, `navCards:${navCards} dashCards:${hasStat} emptyHint:${hasEmptyHint} skeletonGone:${noSkeleton}`);
  await p.close();
}

// 2. 사이드바 pill이 transform 기반인지 (top 인라인 스타일 사용 안 함)
{
  const p = await ctx.newPage();
  await p.goto(`${B}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1200);
  const pill = p.locator('.sidebar-pill').first();
  const transform = await pill.evaluate(el => el.style.transform || getComputedStyle(el).transform);
  const usesTransform = typeof transform === 'string' && transform.includes('translate') || (transform && transform !== 'none');
  log(usesTransform ? '✅' : '❌', 'sidebar:pill-transform', `transform:${transform}`);
  await p.close();
}

// 3. 본문 전환이 fade-in (slide-up 아님)
{
  const p = await ctx.newPage();
  await p.goto(`${B}/menu-sales`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const anim = await p.locator('#main-content').first().evaluate(el => el.style.animation || '');
  const ok = anim.includes('fade-in') && !anim.includes('slide-up');
  log(ok ? '✅' : '❌', 'main:fade-transition', `animation:${anim}`);
  await p.close();
}

// 4. 사이드바 카테고리 클릭 → 첫 탭 이동 + 아코디언 펼침 (네비게이션 동작)
{
  const p = await ctx.newPage();
  await p.goto(`${B}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1000);
  // '식자재' 카테고리 클릭 (자식 있는 그룹)
  const cat = p.locator('.nav-item span', { hasText: '식자재' }).first();
  await cat.click();
  await p.waitForTimeout(1200);
  const url = p.url();
  const moved = url.includes('/ingredient/');
  log(moved ? '✅' : '❌', 'sidebar:category-click', `→ ${url.replace(B,'')}`);
  await p.close();
}

await browser.close();
const pass = r.filter(x => x === '✅').length;
const fail = r.filter(x => x === '❌').length;
console.log(`\n총 ${r.length}개 | ✅ ${pass} | ❌ ${fail}`);
if (fail > 0) process.exit(1);
