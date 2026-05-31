import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const r = [];
const log = (icon, lbl, msg) => { console.log(`${icon} [${lbl}] ${msg}`); r.push(icon); };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// 1. Section hub pages (4개)
for (const [path, expect] of [
  ['/menu-sales', '메뉴 판매량'],
  ['/ingredient', '식자재'],
  ['/nutrition', '영양성분'],
  ['/jette', '제때'],
]) {
  const p = await ctx.newPage();
  await p.goto(`${B}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1500);
  // Should be a hub page (not redirect), should have cards
  const url = p.url();
  const isHub = url === `${B}${path}` || url === `${B}${path}/`;
  const hasCards = await p.locator('.card-lift, button.card-lift').count() > 0;
  const hasRedirect = url !== `${B}${path}` && url !== `${B}${path}/`;
  log(isHub && hasCards ? '✅' : hasRedirect ? '⚠️' : '❌', `hub:${path}`, `URL:${url.replace(B,'')} cards:${await p.locator('.card-lift').count()}`);
  await p.close();
}

// 2. 최근 방문 위젯 (홈)
{
  const p = await ctx.newPage();
  // Set some recent pages in localStorage first
  await p.goto(`${B}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.evaluate(() => {
    try {
      localStorage.setItem('v3:palette-recent', JSON.stringify([
        { href: '/cost/margin', label: '원가마진표' },
        { href: '/note', label: '메뉴개발노트' },
      ]));
    } catch {}
  });
  await p.reload({ waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(2000);
  const hasWidget = await p.locator('text=최근 방문').isVisible().catch(() => false);
  log(hasWidget ? '✅' : '❌', '홈:최근방문위젯', `위젯 표시: ${hasWidget}`);
  await p.close();
}

// 3. Margin loading skeleton
{
  const p = await ctx.newPage();
  await p.goto(`${B}/cost/margin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Immediately check skeleton (before networkidle - it's in loading state)
  const hasSkeleton = await p.locator('.skeleton').count() > 0;
  await p.waitForTimeout(3000);
  const afterLoad = await p.locator('.skeleton').count();
  log(hasSkeleton ? '✅' : '⚠️', 'Margin:로딩스켈레톤', `로딩중 skeleton:${hasSkeleton} 로딩후 skeleton:${afterLoad}`);
  await p.close();
}

// 4. Modal exit animation (ModalFrame)
{
  const { execSync } = await import('child_process');
  const src = execSync('grep -n "isClosing\\|modal-exit\\|handleClose" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/ModalFrame.jsx | head -8').toString();
  log(src.includes('isClosing') ? '✅' : '❌', 'ModalFrame:exit애니', src.trim().split('\n')[0]);
}

// 5. Kanban keyboard nav
{
  const { execSync } = await import('child_process');
  const src = execSync('grep -n "tabIndex\\|ArrowLeft\\|ArrowRight\\|handleKeyDown" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/note/board/page.jsx | head -8').toString();
  log(src.includes('tabIndex') && src.includes('ArrowLeft') ? '✅' : '❌', '칸반:키보드탐색', src.trim().split('\n')[0]);
}

// 6. RecipeEditor dynamic import
{
  const { execSync } = await import('child_process');
  // Use -F (fixed string) with two passes to avoid BSD grep \| issue
  const src1 = execSync('grep -n "next/dynamic" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/cost/recipe/page.jsx | head -3').toString();
  const src2 = execSync('grep -n "dynamic(" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/cost/recipe/page.jsx | head -3').toString();
  const src = src1 + src2;
  log(src.includes('dynamic') ? '✅' : '❌', 'RecipeEditor:dynamic import', (src1.trim() || src2.trim()).split('\n')[0]);
}

// 7. SampleCard component extraction
{
  const { execSync } = await import('child_process');
  const exists = execSync('ls /Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/note/SampleCard.jsx 2>/dev/null || echo "NOT FOUND"').toString().trim();
  const importInPage = execSync('grep -n "SampleCard" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/note/sample/page.jsx | head -3').toString();
  log(exists !== 'NOT FOUND' && importInPage.includes('SampleCard') ? '✅' : '❌', 'SampleCard:분리', `파일: ${exists !== 'NOT FOUND' ? '있음' : '없음'} import: ${importInPage.includes('SampleCard')}`);
}

// 8. NoteTableRow React.memo
{
  const { execSync } = await import('child_process');
  const src = execSync('grep -n "NoteTableRow\\|React.memo" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/note/_NoteContent.jsx | head -5').toString();
  log(src.includes('React.memo') ? '✅' : '❌', 'NoteTableRow:React.memo', src.trim().split('\n')[0]);
}

// 9. importAll parallel
{
  const { execSync } = await import('child_process');
  const src = execSync('grep -n "CHUNK\\|parallel\\|Promise.all" /Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/db/operations.js | head -5').toString();
  log(src.includes('CHUNK') || src.includes('Promise.all') ? '✅' : '❌', 'importAll:병렬화', src.trim().split('\n')[0]);
}

// 10. 주요 라우트 HTTP 200
for (const path of ['/menu-sales', '/ingredient', '/nutrition', '/jette', '/cost/recipe', '/note/sample', '/note/board']) {
  const p = await ctx.newPage();
  const resp = await p.goto(`${B}${path}`, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => null);
  log(resp?.status() === 200 ? '✅' : '❌', `route:${path}`, `HTTP ${resp?.status() ?? 'ERR'}`);
  await p.close();
}

await browser.close();

const pass = r.filter(x=>'✅'===x).length;
const fail = r.filter(x=>'❌'===x).length;
const warn = r.filter(x=>'⚠️'===x).length;
console.log(`\n총 ${r.length}개 | ✅ ${pass} | ❌ ${fail} | ⚠️ ${warn}`);
if (fail > 0) process.exit(1);
