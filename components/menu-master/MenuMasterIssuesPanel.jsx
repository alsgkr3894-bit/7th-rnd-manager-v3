'use client';

import { useState } from 'react';
import {
  buildRecipeIssues,
  filterIssuesByKind,
  ISSUE_KINDS,
  ISSUE_LABELS,
} from '@/lib/menu-master/recipe-issues';

const ISSUE_TABS = [
  { id: 'all', label: '전체' },
  { id: ISSUE_KINDS.NO_RECIPE, label: ISSUE_LABELS[ISSUE_KINDS.NO_RECIPE] },
  { id: ISSUE_KINDS.NEEDS_QUANTITY, label: ISSUE_LABELS[ISSUE_KINDS.NEEDS_QUANTITY] },
  { id: ISSUE_KINDS.NEEDS_PRICE, label: ISSUE_LABELS[ISSUE_KINDS.NEEDS_PRICE] },
  { id: ISSUE_KINDS.NO_PRICE, label: ISSUE_LABELS[ISSUE_KINDS.NO_PRICE] },
];

const ISSUE_TONE = {
  [ISSUE_KINDS.NO_RECIPE]: { background: 'var(--surface-2)', color: 'var(--text-3)' },
  [ISSUE_KINDS.NEEDS_QUANTITY]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  [ISSUE_KINDS.NEEDS_PRICE]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  [ISSUE_KINDS.NO_PRICE]: { background: 'var(--negative-soft)', color: 'var(--negative)' },
};

export function MenuMasterIssuesPanel({ rows, recipeSummaryMap, isViewer, onEdit }) {
  const [issueKindFilter, setIssueKindFilter] = useState('all');

  const allIssues = buildRecipeIssues(rows, recipeSummaryMap);
  const filtered = filterIssuesByKind(allIssues, issueKindFilter);

  const countByKind = {};
  for (const { kind } of allIssues) {
    countByKind[kind] = (countByKind[kind] || 0) + 1;
  }

  if (allIssues.length === 0) {
    return (
      <div
        style={{
          padding: '40px 0',
          textAlign: 'center',
          color: 'var(--text-3)',
          fontSize: 13,
        }}
      >
        이슈 없음 — 모든 메뉴의 레시피가 정상입니다.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {ISSUE_TABS.map(tab => {
          const count = tab.id === 'all' ? allIssues.length : countByKind[tab.id] || 0;
          if (tab.id !== 'all' && count === 0) return null;
          return (
            <button
              key={tab.id}
              className={'chip' + (issueKindFilter === tab.id ? ' active' : '')}
              onClick={() => setIssueKindFilter(tab.id)}
            >
              {tab.label} {count}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '32px 0',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          해당 이슈 없음
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 145 }}>메뉴코드</th>
                  <th>메뉴명</th>
                  <th style={{ width: 100 }}>카테고리</th>
                  <th style={{ width: 60 }}>사이즈</th>
                  <th style={{ width: 120 }}>이슈</th>
                  {!isViewer && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ menu, kind }, i) => {
                  const tone = ISSUE_TONE[kind] || {};
                  return (
                    <tr key={`${menu.menuCode}-${kind}-${i}`}>
                      <td
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent-text)',
                        }}
                      >
                        {menu.menuCode}
                      </td>
                      <td>{menu.menuName}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{menu.category}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {menu.size || <span style={{ color: 'var(--text-4)' }}>단일</span>}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            ...tone,
                          }}
                        >
                          {ISSUE_LABELS[kind]}
                        </span>
                      </td>
                      {!isViewer && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn sm ghost"
                            onClick={() => onEdit(menu)}
                          >
                            수정
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
