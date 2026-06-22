import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const SOURCE_ROOTS = ['app', 'components', 'hooks', 'lib', 'scripts'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

const ALLOWED_DISABLES = [
  {
    file: 'app/cost/margin/useMarginData.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'price upload subscription effect intentionally depends only on reload',
  },
  {
    file: 'app/ingredient/manage/IngredientManagePanel.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'highlight clear timer should reset only when highlight keys or row count change',
  },
  {
    file: 'app/ingredient/manage/IngredientPhotoSection.jsx',
    rule: '@next/next/no-img-element',
    count: 1,
    reason: 'ingredient photos are user-supplied IndexedDB data URLs',
  },
  {
    file: 'app/note/[id]/detail/RelatedSamplesPanel.jsx',
    rule: '@next/next/no-img-element',
    count: 1,
    reason: 'sample thumbnails are user-supplied IndexedDB data URLs',
  },
  {
    file: 'app/note/[id]/detail/RelatedSamplesPanel.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'Korean UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'app/note/[id]/page.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'Korean UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'app/note/sample/_SampleDetailModal.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'photo zoom reset should run only when the selected photo index changes',
  },
  {
    file: 'app/note/sample/detail-modal/SampleDetailPhotoPanel.jsx',
    rule: '@next/next/no-img-element',
    count: 1,
    reason: 'sample photos are user-supplied IndexedDB data URLs',
  },
  {
    file: 'app/note/write/page.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'Korean UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'app/nutrition/export/NutritionLabelResult.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'nutrition label text intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'app/nutrition/export/NutritionLabelTables.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'nutrition table text intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'app/report/menu-sales-compare/page.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'period objects are represented by primitive safeYear/safeMonth deps',
  },
  {
    file: 'components/Sidebar.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 2,
    reason: 'sidebar storage restore and active-group sync intentionally use narrow triggers',
  },
  {
    file: 'components/change-log/ChangeHistoryPanel.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'change log reload is tied to brand and brand filter changes',
  },
  {
    file: 'components/home/ActionCenterWidget.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'partitionByState reads localStorage; rev triggers re-read after dismiss/snooze without being a build-allItems dep',
  },
  {
    file: 'components/cost/manage/CommonEdgesView.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'search reset intentionally excludes unstable table references',
  },
  {
    file: 'components/cost/margin/MarginTrendModal.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'Korean UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'components/menu-master/useMenuRecipeEditor.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'module-level recipe APIs are stable; menu code and category are the trigger inputs',
  },
  {
    file: 'components/nutrition/menu/TabSetCalc.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'set composition UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'components/report/_ShareLinkModal.jsx',
    rule: 'react/no-unescaped-entities',
    count: 1,
    reason: 'share modal UI copy intentionally contains apostrophe-like punctuation',
  },
  {
    file: 'components/sales/UserAliasesSection.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'query changes should cancel edit state without depending on unstable callbacks',
  },
  {
    file: 'components/sales/UserExcludedSection.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'query changes should cancel edit state without depending on unstable callbacks',
  },
  {
    file: 'components/sales/UserRulesSection.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'query changes should cancel edit state without depending on unstable callbacks',
  },
  {
    file: 'components/sales/user-rules/UserRuleForm.jsx',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'category reset is intentionally tied to the main/sub rule mode',
  },
  {
    file: 'hooks/useDBLoad.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'fetchFn/options are intentionally controlled by explicit deps',
  },
  {
    file: 'hooks/useHomeDashboardData.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 3,
    reason: 'dashboard loaders intentionally use refs and narrow refresh triggers',
  },
  {
    file: 'hooks/useLocalStorage.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'initial localStorage hydration must run only once after mount',
  },
  {
    file: 'hooks/useSettingsSection.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'settings section fetch is intentionally a mount-time load',
  },
  {
    file: 'lib/sales/use-sales-upload.js',
    rule: 'react-hooks/exhaustive-deps',
    count: 1,
    reason: 'sales upload initialization runs once and refreshHistory is a local helper',
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

function parseRules(rawRules) {
  return rawRules
    .split(',')
    .map(rule => rule.trim())
    .filter(Boolean);
}

function findEslintDisables() {
  const files = SOURCE_ROOTS.flatMap(root => listSourceFiles(resolve(root)));
  const matches = [];
  const disableRegex = /eslint-disable(?:-next-line|-line)?\s+([^\n*]+)/g;

  for (const filePath of files) {
    const file = filePath.replace(`${resolve('.')}/`, '');
    const source = readFileSync(filePath, 'utf8');
    let match;
    while ((match = disableRegex.exec(source))) {
      const line = lineNumberAt(source, match.index);
      for (const rule of parseRules(match[1])) {
        matches.push({ file, line, rule });
      }
    }
  }

  return matches.sort((a, b) =>
    `${a.file}:${a.line}:${a.rule}`.localeCompare(`${b.file}:${b.line}:${b.rule}`)
  );
}

function countByKey(rows) {
  return rows.reduce((acc, row) => {
    const key = `${row.file}::${row.rule}`;
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());
}

describe('eslint disable policy', () => {
  test('ESLint 예외는 사유가 등록된 allowlist 위치에만 남긴다', () => {
    const expectedRows = ALLOWED_DISABLES.map(({ file, rule, count }) => ({ file, rule, count }));
    const expected = new Map(expectedRows.map(row => [`${row.file}::${row.rule}`, row]));
    const actual = countByKey(findEslintDisables());

    const unexpected = [...actual.keys()]
      .filter(key => !expected.has(key))
      .map(key => {
        const [file, rule] = key.split('::');
        return { file, rule, count: actual.get(key) };
      });

    const mismatchedCounts = expectedRows
      .map(row => {
        const actualCount = actual.get(`${row.file}::${row.rule}`) || 0;
        return actualCount === row.count ? null : { ...row, actualCount };
      })
      .filter(Boolean);

    expect(unexpected).toEqual([]);
    expect(mismatchedCounts).toEqual([]);
  });

  test('allowlist 항목은 모두 사유를 가진다', () => {
    expect(ALLOWED_DISABLES.filter(entry => !entry.reason)).toEqual([]);
  });
});
