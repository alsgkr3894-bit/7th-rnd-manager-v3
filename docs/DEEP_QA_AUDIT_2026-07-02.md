# Deep QA Audit - 2026-07-02

## Scope

- Target: 7th RND manager v3 Next.js app.
- Date: 2026-07-02.
- Focus: full route health, responsive layout, runtime/console failures, input-save-display flows, IndexedDB/local data consistency, QA orchestration reliability, and small UI/QA mismatches.

## Executive Summary

- Stable single-pass route QA can pass: latest single `qa:smoke` and single `qa:mobile` runs both passed 22/22.
- Production baseline is currently strong after a clean restart: `build:clean` passed, production `qa:smoke` passed 22/22, production `qa:mobile` passed 22/22, production `qa:runtime` passed 69/69, production static chunk audit passed 125/125, and deep functional audit passed 6/6.
- Unit/lint/build baseline was strong: `test:ci`, `lint`, and `build:clean` passed.
- The largest confirmed problem is QA/dev-server reliability on Windows/Next dev: parallel or long Playwright runs repeatedly pushed `.next` into inconsistent states (`Cannot find module './8948.js'`, temporary source-file read failures, transient module-not-found for files that exist).
- A transient production server stale/static-serving state was also observed once before restart: static chunks that existed on disk returned 404, causing `ChunkLoadError` and `qa:smoke` 15/22. Restarting `next start` made static chunk audit pass 125/125 and all route QA pass again.
- Current-round API/auth/storage audit passed 13/14 checks. Auth redirects, DB health, backup listing, and server store-row no-op/upsert/delete cleanup worked; the one failure is that the latest local DB backup is stale.
- Current-round a11y/interaction audit completed 134 route/viewport checks in production via a managed `next start` wrapper: 82 clean, 52 with findings. It found no duplicate IDs, no invalid ARIA references, no missing form button types, no horizontal overflow, and no runtime/page/HTTP 500 errors; remaining findings are tiny touch targets and unlabeled controls.
- `qa:full` is unusable on this Windows environment because it fails with `spawn EINVAL` before child QA scripts run.
- Workflow recipe scenario has a stale accessible-name selector. The app recipe UI itself saved and reopened correctly when using the current button name.
- Input-save-display flows are now verified in production for note, calendar schedule, menu master, ingredient, recipe components, and nutrition values, including IndexedDB persistence and cleanup.
- Filtered responsive audit still shows real small-screen candidates, especially bottom navigation overlapping content/CTA controls and a few 320px table/empty-state overflow cases.
- Formatting gate is currently failing repository-wide.

## Confirmed Findings

### F-001: `qa:full` fails on Windows before running child QA scripts

- Severity: High for QA reliability.
- Status: Open.
- Evidence: `npm.cmd run qa:full` failed immediately with `spawn EINVAL`.
- Likely source: `scripts/qa-full.mjs` uses `spawn(npm, ['run', script], { shell: false })` with `npm.cmd`.
- Related file risk: `scripts/qa-prod.mjs` has the same Windows-sensitive `spawn(..., shell: false)` pattern for `npm.cmd`/`npx.cmd`.
- Known working pattern: `scripts/clean-build.mjs` uses a Windows-compatible shell invocation.

### F-002: Workflow QA recipe scenario selector is stale

- Severity: Medium.
- Status: Open.
- Evidence: `npm.cmd run qa:workflow` failed 1/21 at "레시피 UI 저장 -> 재진입 구성품 확인".
- Root mismatch: scenario searches for accessible name `+ 구성품 추가`; actual UI button name is `구성품 추가` because the plus icon is SVG-only.
- Source mismatch:
  - `scripts/workflow/scenarios/recipe-save-ui.mjs`
  - `components/menu-master/MenuRecipeSection.jsx`
- Manual and deep-audit verification: with `구성품 추가`, recipe component save, IndexedDB write, and reopen display passed.

### F-003: `format:check` fails repository-wide

- Severity: Medium for CI/maintenance, Low for runtime.
- Status: Open.
- Evidence: `npm.cmd run format:check` reported Prettier issues in 1356 files.
- Impact: formatting cannot currently be used as a clean CI gate without a large formatting pass.

### F-004: clean production build succeeds, with webpack cache warnings

- Severity: Low.
- Status: Monitor.
- Evidence: `npm.cmd run build:clean` succeeded and generated 59 static pages.
- Warning observed: `webpack.cache.PackFileCacheStrategy` could not snapshot resolve dependencies.

### F-005: Next dev server / `.next` output becomes inconsistent during parallel or long QA

- Severity: High for QA reliability and local developer confidence.
- Status: Open.
- Reproduced multiple times.
- Symptoms observed:
  - `Cannot find module './8948.js'` from `.next/server/webpack-runtime.js`.
  - temporary `Module not found: Can't resolve './_NoteTableView'` even though `app/note/_NoteTableView.jsx` exists.
  - temporary source read failure for `app/note/_NoteRequiredFields.jsx` even though the file exists.
  - `_next/static/...` chunk 404/500 bursts.
  - `Failed to fetch RSC payload`, HMR WebSocket refusal, and `chrome-error://chromewebdata` after server interruption.
- Round 2 evidence: foreground `npm.cmd run dev:clean` followed by `node scripts/full-rt.mjs` failed with 21/69 pass. The first clear break appeared around `/cost/manage` -> `/cost/recipe`, then `./8948.js` errors cascaded into many `_next/static` 404/500 responses and later `ERR_CONNECTION_REFUSED`.
- Important nuance: after the initial compile/race settled, single `qa:smoke` and single `qa:mobile` both passed 22/22, so this is not a confirmed missing-file app bug. It is a dev-server/build-artifact race or invalidation problem.

### F-006: `start-local-site.ps1` can report ready while hidden dev server does not stay alive

- Severity: Medium to High for local QA.
- Status: Open.
- Evidence: `scripts/start-local-site.ps1 -ShowStatus` repeatedly printed "Local site is ready" and "DB health API is responding", but the next browser/cleanup request got `ERR_CONNECTION_REFUSED`.
- Foreground `npm.cmd run dev:clean` stayed alive and served pages, so the hidden `Start-Process` path or child process lifetime/logging needs attention.

### F-007: Filtered responsive audit still finds real small-screen layout candidates

- Severity: Medium.
- Status: Open; needs design/code triage.
- Evidence file: `docs/deep-layout-audit-results-2026-07-02.json`.
- Filtered evidence file: `docs/deep-layout-filtered-audit-2026-07-02.json`.
- Raw results: 268 route/viewport checks, 268 with findings.
- Filtered production rerun: 268 route/viewport checks, 161 clean, 107 with findings.
- Noise sources:
  - persistent sidebar/profile elements at 320px;
  - skip-link clipping;
  - `div "이"` top/profile artifact still accounts for 62 findings in the filtered output.
- Actual candidates worth fixing or manually confirming:
  - 390px: bottom tab overlaps CTA/content on `/note`, `/note/write`, `/note/calendar`, `/note/sample`, `/report`, `/settings/backup`, and related China4 note routes.
  - 768px: bottom tab still overlaps content on `/`, `/menu-master`, `/note/write`, `/note/journal`, `/note/sample/write`, `/report`, `/settings`, and `/settings/brands`.
  - 320px: `/jette/settings` data table overflows; `/cost/edge-dough` action row overflows/overlaps; `/nutrition/menu` empty-state card overflows.
  - Desktop 1280px: `/note/write` "자동 생성" button is reported as clipped in both main and China4-direct contexts.

### F-008: Deep functional audit passes after updating stale QA selectors/timing

- Severity: Low for app runtime; Medium for QA maintenance.
- Status: App flows passed; QA script updated.
- Evidence file: `docs/deep-functional-audit-results-2026-07-02.json`.
- Latest production rerun: 6/6 scenarios passed, with zero page errors, console errors, or HTTP 500+ responses.
- Verified flows:
  - note UI input -> save -> list/detail redisplay -> IndexedDB -> cleanup;
  - schedule UI input -> save -> calendar redisplay -> IndexedDB -> cleanup;
  - menu-master UI input -> save -> list redisplay -> IndexedDB -> cleanup;
  - ingredient UI input -> save -> list redisplay -> IndexedDB -> cleanup;
  - recipe component UI save -> reopen redisplay -> IndexedDB -> cleanup;
  - nutrition value UI save -> reopen redisplay -> IndexedDB -> cleanup.
- QA script corrections made:
  - note title/body selectors now tolerate current placeholders;
  - ingredient add flow now targets the current inline form instead of an old dialog;
  - nutrition value checks wait for the input panel to stabilize before fill/read.

### F-009: Production `next start` can enter a stale static chunk serving state

- Severity: Medium for local/prod smoke confidence.
- Status: Monitor; not active after restart.
- Evidence: first production `qa:smoke` run after one server start passed only 15/22 because existing files under `.next/static/chunks/...` returned HTTP 404 and triggered `ChunkLoadError`/React #423.
- A temporary static chunk audit during that stale state saw 94/125 manifest JS assets served correctly and 31/125 returning 404, including `static/chunks/2709-...`, `static/chunks/765-...`, and several `static/chunks/app/.../page-*.js` files.
- After restarting `next start`, the same static chunk audit passed 125/125, `qa:smoke` passed 22/22, `qa:mobile` passed 22/22, and `qa:runtime` passed 69/69.
- Interpretation: not a confirmed missing file or broken build output. It appears to be a server/session artifact state problem, adjacent to F-005/F-006.

### F-010: Local DB backup status is stale

- Severity: Medium for operations/data safety.
- Status: Open.
- Evidence file: `docs/deep-api-auth-storage-audit-2026-07-02.json`.
- Latest API result: `/api/db/backups` returned structured JSON with `ok: true`, 2 backups, but `stale: true`.
- Latest backup observed: `rnd_manager-20260623-110457.dump`, modified `2026-06-23T02:04:57.374Z`; latest age was about 218 hours against a 26 hour stale threshold.
- Impact: backup listing works, but the local backup schedule/process is not keeping a fresh backup.

### F-011: API/auth/server store-row checks pass, with one read-only IndexedDB observation

- Severity: Low.
- Status: Monitor.
- Evidence file: `docs/deep-api-auth-storage-audit-2026-07-02.json`.
- Passing checks:
  - unauthenticated protected route redirects to `/login`;
  - unauthenticated `/login` renders;
  - authenticated `/login` redirects to `/`;
  - `/api/db/backups` stays public under middleware and returns JSON;
  - `/api/db/health` returns live DB counts (`brands: 3`, `storeRows: 178110`);
  - `/api/db/store-rows` accepts no-op POST, rejects unknown stores with 400, upserts one QA row, then deletes that QA row again.
- Observation: in a fresh browser context, read-only visits to `/note`, `/menu-master`, `/ingredient/manage`, and `/settings/backup` did not create an IndexedDB database before a write path. This is not currently treated as a failure because the deep functional write-path audit verifies actual UI save, redisplay, IndexedDB persistence, and cleanup.

### F-012: A11y/interaction audit finds tiny controls and unlabeled controls

- Severity: Medium for usability/accessibility polish.
- Status: Open.
- Evidence file: `docs/deep-a11y-interaction-audit-2026-07-02.json`.
- Production wrapper result: 134 route/viewport checks, 82 clean, 52 with findings.
- Clean signals: duplicate ID routes 0, invalid ARIA reference routes 0, missing form button type routes 0, positive tabindex routes 0, overflow routes 0, runtime error routes 0.
- Finding summary: 48 routes with tiny controls and 15 routes with unlabeled controls.
- Notable candidates:
  - Home `/`: repeated `나중에 (7일)`, `숨기기`, and `접기` buttons are 17-18px high.
  - Cost/margin and redirected cost pages: advisory/menu-master button is about 128x21, and some numeric inputs are about 56x23 or 194x18.
  - `/nutrition/menu`: one icon-style `button.btn.sm` has no accessible label.
  - `/note/calendar` and China4 direct calendar: previous/next icon buttons are unlabeled; filter buttons `전체`, `노트`, `일정`, `샘플` are about 45x23.
  - `/settings/system`: two 44x24 buttons have no accessible label.
  - `/settings/account`: three `input.form-input` fields have no accessible label.
  - `/settings/restore` and China4 restore: file input is unlabeled and only about 21px high.

### F-013: Long browser sweeps can destabilize current server/build lifecycle

- Severity: High for QA reliability.
- Status: Open.
- New current-round evidence:
  - A full a11y sweep against the existing dev server made port 3000 lose its listener before a result file was produced.
  - Immediately after that, `next start` on 3000 failed because `.next` no longer contained a production build id.
  - First `npm.cmd run build:clean` attempt after the crash compiled, then failed during page data collection with `ENOENT ... .next/server/pages-manifest.json`.
  - A second `npm.cmd run build:clean` immediately afterward succeeded and generated 59 static pages.
  - Running `next start` as a detached/TTY server was unreliable in this environment; the added `scripts/run-next-start-audit.mjs` wrapper kept the server alive long enough to complete the 134-check a11y sweep and then terminated it cleanly.
- Interpretation: this strengthens F-005/F-006/F-009. The app can pass production checks after a clean rebuild, but local QA orchestration and `.next` lifecycle are fragile under repeated browser sweeps.

## Passing Checks Recorded

- `npm.cmd run test:ci`: 315/315 suites, 1926/1926 tests passed.
- `npm.cmd run lint`: passed with no ESLint warnings/errors.
- `npm.cmd run build:clean`: passed; generated 59 static app pages.
- Production static chunk audit: 125/125 manifest JS chunks served with HTTP 200 JavaScript after server restart.
- Production `npm.cmd run qa:smoke`: 22/22 passed.
- Production `npm.cmd run qa:mobile`: 22/22 passed.
- Production `node scripts/full-rt.mjs`: 69/69 route checks passed; page errors, hydration errors, and console errors were zero.
- Production `node scripts/deep-functional-audit.mjs`: 6/6 scenarios passed; page errors, console errors, and HTTP 500+ were zero.
- Deep functional audit cleanup confirmed no `DEEP...` audit records remained in `localhost` or `127.0.0.1` IndexedDB origins.
- Current-round API/auth/storage audit: 13/14 passed; the only failed check is stale local DB backup freshness.
- Current-round a11y/interaction audit: completed 134/134 route/viewport checks; no duplicate IDs, invalid ARIA refs, missing form button types, overflow, runtime/page errors, or HTTP 500+ responses.
- Second current-round `npm.cmd run build:clean`: passed after the first retry failed with a transient `.next/server/pages-manifest.json` ENOENT.

## Added Audit Artifacts

- `scripts/deep-layout-audit.mjs`
- `scripts/summarize-deep-layout-audit.mjs`
- `scripts/deep-functional-audit.mjs`
- `scripts/deep-audit-cleanup.mjs`
- `scripts/deep-audit-origin-server.mjs`
- `scripts/prod-static-chunk-audit.mjs`
- `scripts/deep-layout-filtered-audit.mjs`
- `scripts/deep-api-auth-storage-audit.mjs`
- `scripts/deep-a11y-interaction-audit.mjs`
- `scripts/run-next-start-audit.mjs`
- `docs/deep-layout-audit-results-2026-07-02.json`
- `docs/deep-layout-filtered-audit-2026-07-02.json`
- `docs/deep-functional-audit-results-2026-07-02.json`
- `docs/prod-static-chunk-audit-2026-07-02.json`
- `docs/deep-api-auth-storage-audit-2026-07-02.json`
- `docs/deep-a11y-interaction-audit-2026-07-02.json`

## Recommended Next Fix Order

1. Fix Windows child-process orchestration in `scripts/qa-full.mjs` and `scripts/qa-prod.mjs`.
2. Investigate dev-server and production `.next` corruption under long route sweeps; avoid parallel/cold dev smoke until fixed.
3. Fix or redesign `scripts/start-local-site.ps1` hidden server launch/log capture so "ready" means the process remains alive.
4. Restore or reschedule local DB backups so `/api/db/backups` no longer reports stale.
5. Fix the stale selector in `scripts/workflow/scenarios/recipe-save-ui.mjs`.
6. Triage responsive candidates from `docs/deep-layout-filtered-audit-2026-07-02.json`, starting with bottom navigation overlap and 320px table/action overflow.
7. Triage a11y/interaction candidates from `docs/deep-a11y-interaction-audit-2026-07-02.json`, starting with unlabeled icon buttons/inputs and very short controls.
8. Keep the production static chunk audit in the release checklist until the transient 404 state is understood.
9. Run a repository-wide Prettier pass only when the team is ready for large formatting churn.

## 2026-07-06 Fix Pass

- F-001/F-009: `qa:full` and `qa:prod` now use Windows-safe child process launching. `qa:prod` starts Next through the local Next binary instead of `npx.cmd`, terminates the process tree on Windows, and runs the production static chunk audit before route QA.
- F-002: recipe workflow selector now matches the current accessible button name with `/구성품 추가/`, so it no longer depends on the decorative plus icon being part of the name.
- F-006/F-013: `start-local-site.ps1` now keeps the launched process handle, redirects hidden server logs, fails if the process exits before readiness, performs a follow-up readiness check, and verifies port 3000 is still listening before reporting ready.
- F-007/F-012: fixed several high-repeat responsive/accessibility sources: mobile bottom-tab safe padding, home action-center tiny buttons, widget collapse button size/name, calendar previous/next labels and filter target height, nutrition menu add button label, settings/account/restore input labels, jette managed-products table overflow containment, edge action/check controls, and nutrition menu flex wrapping.
- F-010: current backup freshness is no longer stale in this workspace. `npm.cmd run db:backup:list` shows `rnd_manager-20260706-090236.dump`, modified `2026-07-06T00:02:41.678Z`, size `116509055` bytes.
- Targeted verification completed so far: QA orchestration Jest test, settings/calendar/nutrition structure tests, jette managed-products structure test, common edge/edge-dough structure tests, destructive-action guard structure test, `node --check` for touched QA scripts, and PowerShell parse check for `start-local-site.ps1`.

### 2026-07-06 Final Fix Pass Verification

- F-001/F-009/F-013 are now fixed for the audited local workflow: `scripts/qa-full.mjs`, `scripts/qa-prod.mjs`, and `scripts/clean-build.mjs` no longer depend on fragile Windows `.cmd` shell spawning. `clean-build` now runs the local Next build entrypoint directly and verifies required production artifacts before reporting success.
- F-002 is fixed: the recipe workflow uses the current accessible add-control selector and the full workflow pass verifies saved recipe components after reopening the menu editor.
- F-006 is fixed for this workspace run: `start-local-site.ps1` now detects early process exit, keeps hidden server logs, checks readiness after launch, and verifies the listener before reporting ready.
- Final server restart found and fixed two additional local-start reliability issues: duplicate `Path`/`PATH` process-environment keys could crash `Start-Process`, and hidden `next dev` could exit after initial readiness. The start scripts now normalize the process path key, and `start-local-site.ps1` launches Next through `scripts/start-next-dev-server.mjs` so the dev server remains alive in a hidden background process.
- F-007/F-012 are fixed in the current production audit scope: touch targets, labeled controls, mobile overflows, bottom navigation padding, table containment, icon-button names, file/date/search input sizing, range controls, and action link heights were corrected across the affected views.
- F-010 is fixed for the current workspace state: backup freshness is now current according to the backup listing checked during this pass.
- `npm.cmd run lint`: passed.
- `npm.cmd run test:ci`: 319/319 suites passed, 1972/1972 tests passed.
- `npm.cmd run build:clean`: passed; production artifact verification found the required `BUILD_ID`, prerender manifest, app route manifest, `_error` page, 65 app-route manifest entries, and 60 built app pages.
- Production static chunk audit: 127/127 manifest JavaScript assets served successfully.
- Deep a11y/interaction audit: 136/136 route/viewport checks clean; tiny controls 0, unlabeled controls 0, duplicate IDs 0, invalid ARIA references 0, overflow 0, runtime/page errors 0, HTTP 500+ responses 0.
- `npm.cmd run qa:prod`: passed end to end. Static chunk audit 127/127, smoke QA 22/22, mobile QA 22/22, runtime QA 70/70, workflow QA 21/21.
- Final local server restart: passed with `scripts/start-local-site.ps1 -ShowStatus -TimeoutSeconds 180`; `/login` returned HTTP 200 and `/api/db/health` returned HTTP 200 at `http://127.0.0.1:3000`.
- Expected console errors were observed only in the negative restore-file workflow scenarios, where invalid JSON and structurally invalid backup files are deliberately uploaded to verify the user-facing error path.
- Final status: no reproducible functional, persistence, production chunk, runtime, mobile smoke, or a11y/interaction failure remains in the audited scope after the 2026-07-06 fix pass.
