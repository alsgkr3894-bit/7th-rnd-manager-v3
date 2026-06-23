'use client';

import { useMemo, useState } from 'react';
import {
  buildMenuDataQualityReport,
  QUALITY_KIND_ORDER,
  QUALITY_LABELS,
  QUALITY_TONE,
} from '@/lib/menu-master/data-quality';

export function MenuDataQualityPanel({
  rows = [],
  recipeSummaryMap = new Map(),
  readinessMap = new Map(),
  loading = false,
  isViewer = false,
  onEdit,
}) {
  const [kindFilter, setKindFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const report = useMemo(
    () => buildMenuDataQualityReport(rows, recipeSummaryMap, readinessMap),
    [rows, recipeSummaryMap, readinessMap]
  );

  const visibleIssues = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return report.issues.filter(issue => {
      if (kindFilter !== 'all' && issue.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        issue.menuCode.toLowerCase().includes(q) ||
        issue.menuName.toLowerCase().includes(q) ||
        issue.category.toLowerCase().includes(q) ||
        issue.detail.toLowerCase().includes(q)
      );
    });
  }, [report, kindFilter, searchQ]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
        데이터 품질 진단 중…
      </div>
    );
  }

  if (report.total === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
        데이터 품질 점검 결과, 바로 확인할 누락 항목이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={'chip' + (kindFilter === 'all' ? ' active' : '')}
          onClick={() => setKindFilter('all')}
        >
          전체 {report.total}
        </button>
        {QUALITY_KIND_ORDER.map(kind => {
          const count = report.categories.find(category => category.kind === kind)?.count || 0;
          if (count === 0) return null;
          return (
            <button
              key={kind}
              className={'chip' + (kindFilter === kind ? ' active' : '')}
              onClick={() => setKindFilter(kind)}
            >
              {QUALITY_LABELS[kind]} {count}
            </button>
          );
        })}
        <input
          type="search"
          placeholder="메뉴·진단 검색"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            fontSize: 12,
            border: '1px solid var(--divider)',
            borderRadius: 6,
            background: 'var(--surface)',
            color: 'var(--text)',
            width: 180,
          }}
        />
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>진단</th>
                <th style={{ width: 145 }}>메뉴코드</th>
                <th>메뉴명</th>
                <th style={{ width: 110 }}>카테고리</th>
                <th>상세</th>
                {!isViewer && <th style={{ width: 60 }}></th>}
              </tr>
            </thead>
            <tbody>
              {visibleIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={isViewer ? 5 : 6}
                    style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)' }}
                  >
                    조건에 맞는 진단 항목이 없습니다
                  </td>
                </tr>
              ) : (
                visibleIssues.map((issue, index) => {
                  const tone = QUALITY_TONE[issue.kind] || {};
                  return (
                    <tr key={`${issue.kind}-${issue.menuCode}-${index}`}>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            ...tone,
                          }}
                        >
                          {issue.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent-text)',
                        }}
                      >
                        {issue.menuCode || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{issue.menuName || issue.menuCode || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {issue.category || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{issue.detail}</td>
                      {!isViewer && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn sm ghost"
                            onClick={() => onEdit?.(issue.menu)}
                          >
                            수정
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
