import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, getQaBase, newAuthedContext } from '../qa-browser-utils.mjs';
import {
  firstFailedStep,
  formatStepLine,
  scenarioPassed,
  summarizeScenarios,
} from '../workflow-qa-utils.mjs';
import { createWorkflowDbSafetySnapshot, restoreWorkflowDbSafetySnapshot } from './db-safety.mjs';
import { workflowScenarios } from './scenarios/index.mjs';
import { attachWorkflowDiagnostics, installIdbInitInterceptor } from './helpers.mjs';

export async function runWorkflowQa({ base = getQaBase() } = {}) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'wf-qa-'));
  const runId = String(Date.now());
  const scenarios = [];
  let browser = null;
  let ctx = null;
  let page = null;
  let safetySnapshotPath = null;

  try {
    safetySnapshotPath = createWorkflowDbSafetySnapshot(tmpDir, runId);
    browser = await chromium.launch();
    ctx = await newAuthedContext(browser, { acceptDownloads: true }, base);
    page = await ctx.newPage();

    attachWorkflowDiagnostics(page);
    await installIdbInitInterceptor(page);

    const context = { page, base, tmpDir, runId };
    for (const scenario of workflowScenarios) {
      scenarios.push(await scenario(context));
    }
  } finally {
    const cleanupErrors = [];

    if (page) {
      try {
        await page.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (ctx) {
      try {
        await ctx.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (safetySnapshotPath) {
      try {
        restoreWorkflowDbSafetySnapshot(safetySnapshotPath);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    if (cleanupErrors.length > 0) {
      throw new Error(
        `workflow-qa cleanup failed: ${cleanupErrors
          .map(error => error?.message || String(error))
          .join('; ')}`
      );
    }
  }

  printWorkflowResult(scenarios);
  const { passed, total } = summarizeScenarios(scenarios);
  return passed === total ? 0 : 1;
}

export function printWorkflowResult(scenarios) {
  console.log('\n  업무 흐름 E2E QA\n');
  for (const sc of scenarios) {
    const ok = scenarioPassed(sc.steps);
    console.log(`  ${ok ? '✅PASS' : '❌FAIL'}  ${sc.name}`);
    for (const s of sc.steps) console.log(formatStepLine(s));
    if (!ok) {
      const failed = firstFailedStep(sc.steps);
      if (failed) console.log(`    └ 최초 실패: "${failed.label}" — ${failed.error}`);
    }
  }
  const { passed, total } = summarizeScenarios(scenarios);
  console.log(`\n  ${passed}/${total} 시나리오 통과\n`);
}

export async function main() {
  try {
    const exitCode = await runWorkflowQa();
    process.exit(exitCode);
  } catch (e) {
    console.error('workflow-qa 실행 실패:', e);
    process.exit(2);
  }
}
