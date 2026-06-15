import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const SOURCE_ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

const SILENT_CATCH_PATTERNS = [
  {
    kind: 'empty catch block',
    regex: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g,
  },
  {
    kind: 'empty promise catch',
    regex: /\.catch\(\s*(?:\(\s*\)|\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{\s*\}\s*\)/g,
  },
];

const ALLOWED_SILENT_CATCHES = [
  {
    file: 'app/layout.jsx',
    snippets: ["localStorage.getItem('v3:theme')"],
    reason: 'theme bootstrap must not block first paint',
  },
  {
    file: 'app/note/sample/_SampleFormBody.jsx',
    snippets: ['setProductOptions(opts)'],
    reason: 'sample product suggestions are optional',
  },
  {
    file: 'app/settings/account/page.jsx',
    snippets: ['설정 PIN 변경'],
    reason: 'security work log is best-effort after the PIN change succeeds',
  },
  {
    file: 'app/settings/account/page.jsx',
    snippets: ['설정 PIN 해제'],
    reason: 'security work log is best-effort after the PIN reset succeeds',
  },
  {
    file: 'app/settings/restore/page.jsx',
    snippets: ['복원 자체는 이미 완료됐으므로'],
    reason: 'restore result is already surfaced; only background work log may fail silently',
  },
  {
    file: 'app/settings/system/page.jsx',
    snippets: ['setStorageEst(est)'],
    reason: 'storage estimate is optional diagnostics data',
  },
  {
    file: 'components/AppShell.jsx',
    snippets: ['pruneOldWorkLogs()'],
    reason: 'old work-log pruning is background cleanup',
  },
  {
    file: 'components/AppShell.jsx',
    snippets: ["sessionStorage.setItem(PRUNE_KEY, '1')"],
    reason: 'session flag write is optional cleanup metadata',
  },
  {
    file: 'components/AppShell.jsx',
    snippets: ['hydratePlatformsFromDB()'],
    reason: 'platform setting hydration is best-effort fallback sync',
  },
  {
    file: 'components/cost/ingredient-price/RegisterModal.jsx',
    snippets: ['setSuppliers(rows)'],
    reason: 'supplier autocomplete is optional',
  },
  {
    file: 'components/cost/ingredient-price/RegisterModal.jsx',
    snippets: ["source: 'register'"],
    reason: 'price history must not block ingredient save',
  },
  {
    file: 'components/cost/margin/MarginRow.jsx',
    snippets: ['copyText(parts.join'],
    reason: 'copy shortcut failure is non-blocking inside a dense table row',
  },
  {
    file: 'components/sales/UnmatchedResolveForm.jsx',
    snippets: ['setNameOpts(opts)'],
    reason: 'classification name suggestions are optional',
  },
  {
    file: 'components/sales/UnmatchedTable.jsx',
    snippets: ['setNameOpts(opts)'],
    reason: 'classification name suggestions are optional',
  },
  {
    file: 'components/sales/shared/SectionUtils.jsx',
    snippets: ['localStorage.setItem(PENDING_KEY'],
    reason: 'pending section marker is optional browser storage',
  },
  {
    file: 'components/sales/shared/SectionUtils.jsx',
    snippets: ['localStorage.removeItem(PENDING_KEY'],
    reason: 'pending section marker cleanup is optional browser storage',
  },
  {
    file: 'hooks/useDraftRestore.js',
    snippets: ['applyRef.current(draft)'],
    reason: 'invalid draft restore should not break form mount',
  },
  {
    file: 'hooks/useLocalStorage.js',
    snippets: ['normalizeLocalStorageValue(raw'],
    reason: 'localStorage-backed UI state must tolerate blocked storage',
  },
  {
    file: 'hooks/useLocalStorage.js',
    snippets: ['JSON.stringify(normalizeLocalStorageValue'],
    reason: 'localStorage-backed UI state must tolerate blocked storage',
  },
  {
    file: 'hooks/useScrollMemory.js',
    snippets: ["sessionStorage.getItem('scroll:'"],
    reason: 'scroll memory is optional browser state',
  },
  {
    file: 'hooks/useScrollMemory.js',
    snippets: ["sessionStorage.setItem('scroll:'"],
    reason: 'scroll memory is optional browser state',
  },
  {
    file: 'hooks/useSettingsAuth.js',
    snippets: ['sessionStorage.setItem(SESSION_KEY'],
    reason: 'settings auth session storage may be blocked',
  },
  {
    file: 'hooks/useSettingsAuth.js',
    snippets: ['localStorage.setItem(LS_KEY', 'localStorage.removeItem(LS_KEY'],
    reason: 'settings PIN storage may be blocked but UI must stay responsive',
  },
  {
    file: 'hooks/useSettingsAuth.js',
    snippets: ['sessionStorage.removeItem(SESSION_KEY'],
    reason: 'settings auth session cleanup may be blocked',
  },
  {
    file: 'lib/backup/local-storage-keys.js',
    snippets: ['localStorage.getItem(k)'],
    reason: 'backup localStorage collection skips only unreadable keys',
  },
  {
    file: 'lib/backup-history.js',
    snippets: ['newEntry.id'],
    reason: 'backup work log is best-effort after the backup file is created',
  },
  {
    file: 'lib/backup-history.js',
    snippets: ['localStorage.removeItem(KEY)'],
    reason: 'backup history cleanup is optional browser storage',
  },
  {
    file: 'lib/cost/edge-dough/store.js',
    snippets: ["logWork('RESET'"],
    reason: 'reset work log is best-effort after data deletion succeeds',
  },
  {
    file: 'lib/cost/margin/platforms.js',
    snippets: ['localStorage.getItem(KEYS.COST_PLATFORMS)'],
    reason: 'platform setting read falls back to defaults',
  },
  {
    file: 'lib/cost/margin/platforms.js',
    snippets: ['localStorage.setItem(KEYS.COST_PLATFORMS'],
    reason: 'platform setting mirror is best-effort browser storage',
  },
  {
    file: 'lib/db/crud.js',
    snippets: ['db.close()'],
    reason: 'deleteDatabase can continue if the cached DB was already closed',
  },
  {
    file: 'lib/db/crud.js',
    snippets: ['tx.abort()'],
    reason: 'transaction abort can already be complete while original error is reported',
  },
  {
    file: 'lib/db/shared.js',
    snippets: ['tx.abort()', 'reject(err)'],
    reason: 'transaction abort can already be complete while original error is reported',
  },
  {
    file: 'lib/note/keys.js',
    snippets: ['sessionStorage.setItem(key'],
    reason: 'note handoff keys are optional browser storage',
  },
  {
    file: 'lib/note/keys.js',
    snippets: ['sessionStorage.removeItem(key'],
    reason: 'note handoff key cleanup is optional browser storage',
  },
  {
    file: 'lib/note/keys.js',
    snippets: ['SAMPLE_FROM_NOTE'],
    reason: 'note-to-sample handoff is optional browser storage',
  },
  {
    file: 'lib/note/storage.js',
    snippets: ['localStorage.setItem(key, val)'],
    reason: 'note UI storage helpers are best-effort',
  },
  {
    file: 'lib/note/storage.js',
    snippets: ['localStorage.setItem(key, JSON.stringify(val))'],
    reason: 'note UI storage helpers are best-effort',
  },
  {
    file: 'lib/note/storage.js',
    snippets: ['localStorage.removeItem(key)'],
    reason: 'note UI storage cleanup is best-effort',
  },
  {
    file: 'lib/note/store.js',
    snippets: ['노트 삭제:'],
    reason: 'note delete work log is best-effort after delete succeeds',
  },
  {
    file: 'lib/price/use-price-upload.js',
    snippets: ['setManagedProducts(products)'],
    reason: 'managed product listener refresh is optional',
  },
  {
    file: 'lib/price/use-price-upload.js',
    snippets: ['제때 단가 업로드'],
    reason: 'price upload work log is best-effort after upload succeeds',
  },
  {
    file: 'lib/print/window-print.js',
    snippets: ['팝업이 차단되었습니다'],
    reason: 'toast module load failure should not throw from print fallback',
  },
  {
    file: 'lib/sales/resolve.js',
    snippets: ['tx.abort()', 'reject({ code:'],
    reason: 'transaction abort can already be complete while original error is reported',
  },
  {
    file: 'lib/sales/use-sales-upload.js',
    snippets: ['판매량 업로드:'],
    reason: 'sales upload work log is best-effort after upload succeeds',
  },
  {
    file: 'lib/sample/store.js',
    snippets: ["logWork('DELETE'"],
    reason: 'sample delete work log is best-effort after delete succeeds',
  },
  {
    file: 'lib/session.js',
    snippets: ['sessionStorage.setItem(key, value)'],
    reason: 'session helper must tolerate blocked browser storage',
  },
  {
    file: 'lib/settings.js',
    snippets: ['localStorage.setItem(PREFIX + key'],
    reason: 'visual setting application should not fail when storage is blocked',
  },
  {
    file: 'lib/shipment/use-shipment.js',
    snippets: ['setManagedProducts(products)'],
    reason: 'managed product listener refresh is optional',
  },
];

function listSourceFiles(dir) {
  return readdirSync(dir)
    .flatMap(name => {
      const fullPath = join(dir, name);
      if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
      return SOURCE_EXTENSIONS.has(extname(fullPath)) ? [fullPath] : [];
    })
    .sort();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function contextAround(source, lineNumber) {
  const lines = source.split(/\r?\n/);
  const start = Math.max(0, lineNumber - 4);
  const end = Math.min(lines.length, lineNumber + 3);
  return lines.slice(start, end).join('\n');
}

function findSilentCatches() {
  const files = SOURCE_ROOTS.flatMap(root => listSourceFiles(resolve(root)));
  const matches = [];

  for (const filePath of files) {
    const file = filePath.replace(`${resolve('.')}/`, '');
    const source = readFileSync(filePath, 'utf8');
    for (const { kind, regex } of SILENT_CATCH_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(source))) {
        const line = lineNumberAt(source, match.index);
        const context = contextAround(source, line);
        matches.push({ file, kind, line, context });
      }
    }
  }

  return matches.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
}

function isAllowedSilentCatch(match) {
  return ALLOWED_SILENT_CATCHES.some(rule => {
    if (rule.file !== match.file) return false;
    return rule.snippets.every(snippet => match.context.includes(snippet));
  });
}

describe('silent catch policy', () => {
  test('빈 catch와 빈 Promise catch는 명시 allowlist에 등록된 위치에만 남긴다', () => {
    const unlisted = findSilentCatches()
      .filter(match => !isAllowedSilentCatch(match))
      .map(match => ({
        file: match.file,
        line: match.line,
        kind: match.kind,
        context: match.context,
      }));

    expect(unlisted).toEqual([]);
  });

  test('삭제 실행취소와 복원 실패는 무음 처리하지 않는다', () => {
    const noteSource = readFileSync(resolve('app/note/_NoteContent.jsx'), 'utf8');
    const ingredientSource = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');
    const restoreSource = readFileSync(resolve('app/settings/restore/page.jsx'), 'utf8');
    const backupSource = readFileSync(resolve('lib/db/backup.js'), 'utf8');

    expect(noteSource).not.toMatch(/restoreRecord\([^)]*\)\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/);
    expect(noteSource).toContain("showToast('실행취소 실패: ' + err.message, 'error')");

    expect(ingredientSource).not.toMatch(
      /restoreRecord\([^)]*\)\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/
    );
    expect(ingredientSource).toContain("showToast('실행취소 실패: ' + err.message, 'error')");

    expect(restoreSource).toContain('errors?.length > 0');
    expect(restoreSource).toContain("console.warn('[Restore] 일부 실패:', errors)");

    expect(backupSource).toContain('localStorageErrors');
    expect(backupSource).toContain("store: 'localStorage'");
  });
});
