import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const tableSource = readFileSync(resolve('components/sales/UnmatchedTable.jsx'), 'utf8');
const bulkActionsSource = readFileSync(
  resolve('components/sales/unmatched/UnmatchedBulkActions.jsx'),
  'utf8'
);
const bulkRuleSource = readFileSync(
  resolve('components/sales/unmatched/UnmatchedBulkRulePanel.jsx'),
  'utf8'
);
const issueTableSource = readFileSync(
  resolve('components/sales/unmatched/UnmatchedIssueTable.jsx'),
  'utf8'
);
const issueRowSource = readFileSync(
  resolve('components/sales/unmatched/UnmatchedIssueRow.jsx'),
  'utf8'
);

describe('unmatched table structure', () => {
  test('UnmatchedTable keeps state orchestration and delegates bulk/table UI sections', () => {
    expect(tableSource).toContain('<UnmatchedBulkActions');
    expect(tableSource).toContain('<UnmatchedIssueTable');
    expect(tableSource).toContain('useReducer');
    expect(tableSource).toContain('getClassificationNameOptions');
    expect(tableSource).toContain('setNameOpts(opts)');
    expect(tableSource).not.toContain('<ComboBox');
    expect(tableSource).not.toContain('<UnmatchedResolveForm');
    expect(tableSource).not.toContain('<Pagination');
    expect(tableSource).not.toContain('formatNumber');
    expect(tableSource).not.toContain('function Row');
    expect(tableSource.split('\n').length).toBeLessThanOrEqual(230);
  });

  test('child components own bulk action, rule panel, issue table, and issue row rendering', () => {
    expect(bulkActionsSource).toContain('export function UnmatchedBulkActions');
    expect(bulkActionsSource).toContain('<UnmatchedBulkRulePanel');
    expect(bulkActionsSource).toContain('선택 일괄 제외');
    expect(bulkRuleSource).toContain('export function UnmatchedBulkRulePanel');
    expect(bulkRuleSource).toContain('<ComboBox');
    expect(bulkRuleSource).toContain('CATEGORY_ORDER');
    expect(issueTableSource).toContain('export function UnmatchedIssueTable');
    expect(issueTableSource).toContain('<Pagination');
    expect(issueTableSource).toContain('<UnmatchedIssueRow');
    expect(issueRowSource).toContain('export function UnmatchedIssueRow');
    expect(issueRowSource).toContain('<UnmatchedResolveForm');
    expect(issueRowSource).toContain('formatNumber');
    expect(issueRowSource).toContain('미해결');
    expect(issueRowSource).toContain('해결됨');
  });
});
