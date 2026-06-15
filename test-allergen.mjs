import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const AUTH = 'v3:auth=test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ extraHTTPHeaders: { Cookie: AUTH } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

await page.goto(BASE + '/nutrition/allergen', { waitUntil: 'networkidle', timeout: 20000 });

// 기본 스탯 카드 값들
const stats = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="SmallStat"], .stat-card, [data-stat]');
  const texts = [];
  document.querySelectorAll('.card').forEach(c => {
    const t = c.innerText?.trim();
    if (t && t.length < 200) texts.push(t);
  });
  return texts.slice(0, 10);
});

// 알레르기 등록 식자재 / 전체 식자재 / 매칭 메뉴 수
const statValues = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')];
  return all
    .filter(el => ['알레르기 등록 식자재', '전체 식자재', '알레르기 매칭 메뉴'].some(s => el.innerText?.includes(s)))
    .map(el => el.innerText?.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 6);
});

// 경고 배너 확인
const warnBanner = await page.evaluate(() =>
  document.body.innerText.includes('알레르기 등록 식자재 없음')
);

// ingredient 뷰에서 식자재 목록
const ingRows = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('tr, [role="row"], [class*="row"]').forEach(r => {
    const t = r.innerText?.trim().slice(0, 80);
    if (t) rows.push(t);
  });
  return rows.slice(0, 20);
});

// menu 탭 클릭 후 확인
const menuTabBtn = await page.$('button:has-text("메뉴별")');
if (menuTabBtn) {
  await menuTabBtn.click();
  await page.waitForTimeout(500);
}

const menuRows = await page.evaluate(() => {
  const rows = [];
  document.querySelectorAll('tr, [role="row"]').forEach(r => {
    const t = r.innerText?.trim().slice(0, 80);
    if (t) rows.push(t);
  });
  return rows.slice(0, 15);
});

await browser.close();

console.log('=== 현재 알레르기 페이지 상태 ===');
console.log('\n[경고 배너]', warnBanner ? '⚠️ 알레르기 등록 식자재 없음' : '없음');
console.log('\n[스탯 카드]');
statValues.forEach(v => console.log(' -', v));
console.log('\n[식자재별 행 샘플]');
ingRows.forEach(r => console.log(' -', r));
console.log('\n[메뉴별 행 샘플]');
menuRows.forEach(r => console.log(' -', r));
if (consoleErrors.length) {
  console.log('\n[콘솔 에러]');
  consoleErrors.forEach(e => console.log(' ❌', e.slice(0, 100)));
}
