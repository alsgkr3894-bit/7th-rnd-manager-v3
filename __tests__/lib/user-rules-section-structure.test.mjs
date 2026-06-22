import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  filterUserRule,
  isValidUserRuleForm,
  nextUserRuleSortState,
  sortUserRules,
  userRuleFormFromItem,
} from '../../components/sales/user-rules/userRulesUtils.js';

const sectionSource = readFileSync(resolve('components/sales/UserRulesSection.jsx'), 'utf8');
const formSource = readFileSync(resolve('components/sales/user-rules/UserRuleForm.jsx'), 'utf8');
const tableSource = readFileSync(resolve('components/sales/user-rules/UserRulesTable.jsx'), 'utf8');
const utilsSource = readFileSync(resolve('components/sales/user-rules/userRulesUtils.js'), 'utf8');

describe('user rules section structure', () => {
  test('UserRulesSection delegates form, table, and pure sorting/filter helpers', () => {
    expect(sectionSource).toContain('<UserRuleForm');
    expect(sectionSource).toContain('<UserRulesTable');
    expect(sectionSource).toContain('canEdit = false');
    expect(sectionSource).toContain('disabled={!canEdit}');
    expect(sectionSource).toContain('canEdit={canEdit}');
    expect(sectionSource).toContain('sortUserRules');
    expect(sectionSource).toContain('filterUserRule');
    expect(sectionSource).not.toContain('<Toggle');
    expect(sectionSource).not.toContain('<ComboBox');
    expect(sectionSource).not.toContain('InlineConfirmButtons');
    expect(sectionSource).not.toContain('function RowForm');
    expect(sectionSource).not.toContain('function valueForSort');
    expect(sectionSource.split('\n').length).toBeLessThanOrEqual(210);

    expect(formSource).toContain('export function UserRuleForm');
    expect(formSource).toContain('<ComboBox');
    expect(formSource).toContain('disabled={!canEdit}');
    expect(formSource).toContain('CATEGORY_OPTIONS');
    expect(formSource).toContain('패턴 (정규화 후)');
    expect(tableSource).toContain('export function UserRulesTable');
    expect(tableSource).toContain('function UserRuleTableRow');
    expect(tableSource).toContain('<Toggle');
    expect(tableSource).toContain('disabled={!canEdit');
    expect(tableSource).toContain('<InlineConfirmButtons');
    expect(tableSource).toContain('<Pagination');
    expect(utilsSource).toContain('export function sortUserRules');
    expect(utilsSource).toContain('export function nextUserRuleSortState');
  });

  test('user rule helpers keep form, filter, and sort behavior stable', () => {
    const rules = [
      {
        id: 'old',
        pattern: '페퍼로니 L',
        category: '피자',
        groupName: '클래식',
        detailName: '페퍼로니',
        createdAt: '2024-01-01',
      },
      {
        id: 'new',
        rawMenuName: '치즈오븐스파게티',
        category: '사이드',
        groupName: '파스타',
        detailName: '오븐',
        createdAt: '2025-01-01',
      },
    ];

    expect(userRuleFormFromItem(rules[0])).toEqual({
      rawMenuName: '페퍼로니 L',
      category: '피자',
      groupName: '클래식',
      detailName: '페퍼로니',
    });
    expect(
      isValidUserRuleForm({ rawMenuName: '치즈', category: '사이드', groupName: '파스타' })
    ).toBe(true);
    expect(isValidUserRuleForm({ rawMenuName: '치즈', category: '', groupName: '파스타' })).toBe(
      false
    );
    expect(rules.filter(rule => filterUserRule(rule, '파스타')).map(rule => rule.id)).toEqual([
      'new',
    ]);
    expect(sortUserRules(rules, 'createdAt', 'desc').map(rule => rule.id)).toEqual(['new', 'old']);
    expect(sortUserRules(rules, 'category', 'asc').map(rule => rule.id)).toEqual(['new', 'old']);
    expect(nextUserRuleSortState({ sortKey: 'category', sortDir: 'asc' }, 'category')).toEqual({
      sortKey: 'category',
      sortDir: 'desc',
    });
    expect(nextUserRuleSortState({ sortKey: 'category', sortDir: 'desc' }, 'createdAt')).toEqual({
      sortKey: 'createdAt',
      sortDir: 'desc',
    });
  });
});
