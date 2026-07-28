#!/usr/bin/env node
/**
 * scripts/jette/download.mjs — 제때(ebiz.jette.co.kr) 엑셀 자동 다운로더
 *
 * 로그인이 필요한 제때 발주 시스템에서 단가/출고량 엑셀을 자동으로 내려받는다.
 * 완전 무인 로그인은 인증번호(authNum) 때문에 막힐 수 있으므로,
 * 최초 1회는 브라우저를 띄워 직접 로그인 → 세션을 저장하고,
 * 이후에는 저장된 세션으로 무인 다운로드한다.
 *
 * 사용법:
 *   node scripts/jette/download.mjs login              # 1) 세션 저장 (headed, 직접 로그인)
 *   node scripts/jette/download.mjs inspect <url>      # 2) 리포트 페이지의 다운로드 버튼 찾기
 *   node scripts/jette/download.mjs download [target]  # 3) 엑셀 다운로드 (target: price|shipment|all)
 *
 * 옵션:
 *   --headed        download 모드에서도 브라우저를 표시 (디버깅)
 *   --config <path> config 파일 경로 지정 (기본: scripts/jette/jette.config.json)
 *
 * 자격증명/세션/다운로드 파일은 .gitignore 처리됨.
 */

import pw from '../../node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const mode = argv[0] || 'help';
const positional = argv.slice(1).filter(a => !a.startsWith('--'));
const flags = new Set(argv.filter(a => a.startsWith('--')));
function flagValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

const CONFIG_PATH = path.resolve(ROOT, flagValue('--config') || 'scripts/jette/jette.config.json');
const HEADED = flags.has('--headed');

// ── helpers ───────────────────────────────────────────────────────────────
function log(...a) {
  console.log('[jette]', ...a);
}
function fail(msg) {
  console.error('[jette] ✗', msg);
  process.exit(1);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fail(
      `config 파일이 없습니다: ${path.relative(ROOT, CONFIG_PATH)}\n` +
        `  → scripts/jette/jette.config.example.json 를 복사해서 만들고 값을 채우세요.`
    );
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    fail(`config JSON 파싱 실패: ${e.message}`);
  }
  cfg.baseUrl = (cfg.baseUrl || 'https://ebiz.jette.co.kr').replace(/\/+$/, '');
  cfg.loginPath = cfg.loginPath || '/Home/LogOn?ReturnUrl=%2f';
  cfg.downloadDir = path.resolve(ROOT, cfg.downloadDir || '.jette-downloads');
  cfg.sessionFile = path.resolve(ROOT, cfg.sessionFile || 'scripts/jette/.jette-session.json');
  cfg.reports = cfg.reports || {};
  return cfg;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => (rl.close(), resolve(ans))));
}

// yyyymmdd-hhmmss (파일명용). Date는 node에서 사용 가능.
function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function sanitize(name) {
  return String(name || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'download';
}

// ROOT 안쪽이면 상대경로, 밖(예: 바탕화면)이면 절대경로로 보기 좋게 표시
function displayPath(p) {
  const rel = path.relative(ROOT, p);
  return rel.startsWith('..') ? p : rel;
}

// ── mode: login ─────────────────────────────────────────────────────────────
// 로그인 완료를 자동 감지한다: URL이 LogOn 을 벗어나면 성공으로 보고 세션 저장.
// (터미널 Enter 입력이 필요 없으므로 무인 실행기에서도 브라우저만 띄워 로그인 가능)
async function runLogin(cfg) {
  const timeoutSec = Number(flagValue('--timeout') || 240);
  log('브라우저를 띄웁니다. 아이디/비밀번호는 자동 입력됩니다.');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(cfg.baseUrl + cfg.loginPath, { waitUntil: 'domcontentloaded' });

  // 아이디/비밀번호 자동 채움 (있을 때만)
  try {
    if (cfg.credentials?.userId) await page.fill('#userId', cfg.credentials.userId);
    if (cfg.credentials?.password) await page.fill('#password', cfg.credentials.password);
    log('아이디/비밀번호를 채웠습니다.');
  } catch {
    log('로그인 입력칸 자동 채움 실패 — 브라우저에서 직접 입력하세요.');
  }

  console.log('');
  console.log('  ┌──────────────────────────────────────────────────────────────┐');
  console.log('  │ 브라우저에서 로그인을 완료하세요 (인증번호가 있으면 입력).      │');
  console.log('  │ 로그인이 끝나면 자동으로 감지해 세션을 저장하고 종료합니다.     │');
  console.log(`  │ (최대 ${String(timeoutSec).padEnd(3)}초 대기)                                        │`);
  console.log('  └──────────────────────────────────────────────────────────────┘');
  console.log('');

  // LogOn 을 벗어날 때까지 폴링
  const deadline = Date.now() + timeoutSec * 1000;
  let loggedIn = false;
  while (Date.now() < deadline) {
    let url = '';
    try {
      url = page.url();
    } catch {
      // 페이지/브라우저가 닫힌 경우
      fail('브라우저가 닫혔습니다. 로그인 전에 창을 닫지 마세요.');
    }
    if (url && !/LogOn/i.test(url)) {
      loggedIn = true;
      break;
    }
    await page.waitForTimeout(2000);
  }

  if (!loggedIn) {
    await browser.close();
    fail(`제한시간(${timeoutSec}s) 내 로그인이 감지되지 않았습니다. 다시 시도하세요 (--timeout 으로 시간 조절).`);
  }

  // 로그인 후 페이지가 안정될 시간을 잠깐 준다
  await page.waitForTimeout(1500);
  fs.mkdirSync(path.dirname(cfg.sessionFile), { recursive: true });
  await context.storageState({ path: cfg.sessionFile });
  log(`✓ 로그인 감지됨 (${page.url()})`);
  log(`✓ 세션 저장됨: ${path.relative(ROOT, cfg.sessionFile)}`);
  await browser.close();
}

// ── mode: inspect ────────────────────────────────────────────────────────────
// 리포트 페이지를 열고 "엑셀/다운로드"로 보이는 링크·버튼 후보를 나열한다.
async function runInspect(cfg, targetUrl) {
  if (!targetUrl) fail('inspect 대상 URL을 지정하세요. 예: inspect https://ebiz.jette.co.kr/…');
  if (!fs.existsSync(cfg.sessionFile)) fail('세션이 없습니다. 먼저 `login` 을 실행하세요.');

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ storageState: cfg.sessionFile, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  if (/LogOn/i.test(page.url())) {
    await browser.close();
    fail('세션이 만료된 것 같습니다 (LogOn으로 리다이렉트). `login` 을 다시 실행하세요.');
  }

  const candidates = await page.evaluate(() => {
    const kw = /(엑셀|excel|xls|다운|download|내려받기|추출|export)/i;
    const out = [];
    const els = Array.from(document.querySelectorAll('a, button, input[type=button], input[type=submit], [onclick]'));
    for (const el of els) {
      const text = (el.innerText || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
      const oc = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      if (kw.test(text) || kw.test(oc) || kw.test(href)) {
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).join('.')
          : '';
        out.push({
          tag: el.tagName.toLowerCase(),
          text: text.slice(0, 60),
          selector: id || (el.tagName.toLowerCase() + cls).slice(0, 80),
          onclick: oc.slice(0, 80),
          href: href.slice(0, 80),
        });
      }
    }
    return out;
  });

  console.log('\n=== 다운로드 후보 (엑셀/다운로드/export 키워드) ===');
  if (candidates.length === 0) {
    console.log('후보를 찾지 못했습니다. --headed 로 직접 보면서 확인하세요.');
  } else {
    candidates.forEach((c, i) => {
      console.log(`\n[${i + 1}] <${c.tag}> "${c.text}"`);
      console.log(`    selector : ${c.selector}`);
      if (c.onclick) console.log(`    onclick  : ${c.onclick}`);
      if (c.href) console.log(`    href     : ${c.href}`);
    });
    console.log('\n→ 위 selector(또는 `text=<버튼문구>`)를 config의 해당 report.trigger 에 넣으세요.');
    console.log(`→ 이 페이지 URL을 report.url 에 넣으세요: ${page.url()}`);
  }

  if (HEADED) {
    await ask('\n브라우저 확인 후 Enter ▶ ');
  }
  await browser.close();
}

// ── mode: download ───────────────────────────────────────────────────────────
// 제때 SPA의 로딩 막(.ui-widget-overlay / #pageIndicator)이 사라질 때까지 대기
async function waitLoaders(page, ms = 30000) {
  try {
    await page.waitForFunction(
      () => {
        const vis = el =>
          el &&
          el.offsetParent !== null &&
          getComputedStyle(el).display !== 'none' &&
          getComputedStyle(el).visibility !== 'hidden';
        return (
          !vis(document.querySelector('.ui-widget-overlay')) &&
          !vis(document.querySelector('#pageIndicator, .loader, .loader_background'))
        );
      },
      { timeout: ms }
    );
  } catch {
    /* 타임아웃이어도 진행 */
  }
  await page.waitForTimeout(300);
}

/**
 * steps 실행기. 각 step 은 { do, ... } 형태.
 * 지원 action:
 *   { do:'goto', url }                 페이지 이동
 *   { do:'wait', ms }                  고정 대기
 *   { do:'openCombo', nth }            nth번째 igCombo 드롭다운 열기
 *   { do:'pickItem', text }           드롭다운 <li> 중 정확히 text인 항목 선택
 *   { do:'click', selector }          JS 직접 클릭(오버레이 우회)
 *   { do:'fill', selector, value }    입력값 채우기
 *   { do:'download', selector }       JS 클릭 + 다운로드 캡처 (반드시 마지막)
 * 각 step 후 로딩 막이 사라질 때까지 자동 대기.
 */
async function runSteps(page, cfg, key, steps) {
  let download = null;
  for (const step of steps) {
    switch (step.do) {
      case 'goto':
        await page.goto(step.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(step.ms ?? 3500);
        if (/LogOn/i.test(page.url())) {
          throw new Error('세션 만료 (LogOn 리다이렉트) — `login` 을 다시 실행하세요.');
        }
        break;
      case 'wait':
        await page.waitForTimeout(step.ms ?? 1000);
        break;
      case 'openCombo':
        await page.locator('.ui-igcombo-button').nth(step.nth ?? 0).click({ timeout: 10000 });
        await page.waitForTimeout(step.ms ?? 900);
        break;
      case 'pickItem': {
        const picked = await page.evaluate(txt => {
          const lis = Array.from(document.querySelectorAll('li')).filter(e => e.offsetParent !== null);
          const t = lis.find(e => (e.innerText || e.textContent || '').trim() === txt);
          if (!t) return false;
          t.scrollIntoView();
          t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          t.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          t.click();
          return true;
        }, step.text);
        if (!picked) throw new Error(`드롭다운 항목을 찾을 수 없습니다: "${step.text}"`);
        await page.waitForTimeout(step.ms ?? 1200);
        break;
      }
      case 'click': {
        const clicked = await page.evaluate(sel => {
          const el = document.querySelector(sel);
          if (!el) return false;
          el.click();
          return true;
        }, step.selector);
        if (!clicked) throw new Error(`요소를 찾을 수 없습니다: ${step.selector}`);
        break;
      }
      case 'fill':
        await page.fill(step.selector, String(step.value ?? ''));
        break;
      case 'download': {
        const [dl] = await Promise.all([
          page.waitForEvent('download', { timeout: step.timeoutMs ?? 60000 }),
          page.evaluate(sel => {
            const el = document.querySelector(sel);
            if (!el) throw new Error('download 버튼 없음: ' + sel);
            el.click();
          }, step.selector),
        ]);
        download = dl;
        break;
      }
      default:
        throw new Error(`알 수 없는 step.do: ${step.do}`);
    }
    await waitLoaders(page);
  }
  return download;
}

async function downloadOne(context, cfg, key, report) {
  // steps 방식(권장) 또는 단순 url+trigger 방식 지원
  const hasSteps = Array.isArray(report.steps) && report.steps.length > 0;
  if (!hasSteps && !report.url) {
    log(`⚠ [${key}] steps 도 url 도 없어 건너뜁니다.`);
    return { key, skipped: true };
  }

  const page = await context.newPage();
  try {
    let download;
    if (hasSteps) {
      download = await runSteps(page, cfg, key, report.steps);
    } else {
      // 단순 방식: url 이동 → trigger 클릭 → 다운로드
      await page.goto(report.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(report.waitAfterLoadMs ?? 1500);
      if (/LogOn/i.test(page.url())) {
        throw new Error('세션 만료 (LogOn 리다이렉트) — `login` 을 다시 실행하세요.');
      }
      if (!report.trigger) throw new Error('report.trigger 가 비어 있습니다.');
      [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60000 }),
        page.click(report.trigger),
      ]);
    }

    if (!download) throw new Error('다운로드가 발생하지 않았습니다 (steps 에 download step 이 있는지 확인).');

    const outDir = path.join(cfg.downloadDir, key);
    fs.mkdirSync(outDir, { recursive: true });
    const outName = `${stamp()}-${sanitize(download.suggestedFilename())}`;
    const outPath = path.join(outDir, outName);
    await download.saveAs(outPath);
    log(`✓ [${key}] ${report.label || key} → ${displayPath(outPath)}`);
    return { key, path: outPath };
  } catch (e) {
    log(`✗ [${key}] 실패: ${e.message}`);
    return { key, error: e.message };
  } finally {
    await page.close();
  }
}

async function runDownload(cfg, target) {
  if (!fs.existsSync(cfg.sessionFile)) fail('세션이 없습니다. 먼저 `login` 을 실행하세요.');

  const keys =
    !target || target === 'all'
      ? Object.keys(cfg.reports)
      : cfg.reports[target]
        ? [target]
        : fail(`알 수 없는 대상: ${target} (사용 가능: ${Object.keys(cfg.reports).join(', ')}, all)`);

  if (!keys.length) fail('config.reports 가 비어 있습니다.');

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ storageState: cfg.sessionFile, acceptDownloads: true });

  const results = [];
  for (const key of keys) {
    results.push(await downloadOne(context, cfg, key, cfg.reports[key]));
  }
  await browser.close();

  const ok = results.filter(r => r.path);
  const skipped = results.filter(r => r.skipped);
  const errored = results.filter(r => r.error);
  console.log('');
  log(`완료: 성공 ${ok.length}, 건너뜀 ${skipped.length}, 실패 ${errored.length}`);
  if (ok.length) {
    console.log('\n다음 단계 — 앱에 업로드:');
    console.log('  • 단가:  /jette/price-compare 업로드 화면에 내려받은 파일을 올리세요.');
    console.log('  • 출고량: /jette/shipment 업로드 화면에 올리세요.');
    console.log(`  • 파일 위치: ${displayPath(cfg.downloadDir)}\\<price|shipment>\\`);
  }
  if (errored.length) process.exitCode = 1;
}

// ── main ─────────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`제때 엑셀 자동 다운로더

  node scripts/jette/download.mjs login              최초 1회: 브라우저로 로그인 → 세션 저장
  node scripts/jette/download.mjs inspect <url>      리포트 페이지의 다운로드 버튼 selector 찾기
  node scripts/jette/download.mjs download [target]  엑셀 다운로드 (target: price | shipment | all)

  옵션: --headed  브라우저 표시 | --config <path>  config 경로 지정

  준비물: scripts/jette/jette.config.json (example 복사 후 값 입력)`);
}

async function main() {
  if (mode === 'help' || flags.has('--help')) return printHelp();
  const cfg = loadConfig();
  if (mode === 'login') return runLogin(cfg);
  if (mode === 'inspect') return runInspect(cfg, positional[0]);
  if (mode === 'download') return runDownload(cfg, positional[0]);
  printHelp();
  fail(`알 수 없는 명령: ${mode}`);
}

main().catch(e => fail(e?.stack || e?.message || String(e)));
