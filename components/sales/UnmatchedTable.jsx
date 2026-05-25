'use client';
import { useState, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { UnmatchedResolveForm } from './UnmatchedResolveForm';

/**
 * UnmatchedTable — 미매칭 issue 목록 (개별 해결 + 일괄 제외)
 *
 * @param {Array} issues
 * @param {(issueId, actionType, actionData) => Promise<void>} onResolve
 * @param {(issueIds: number[]) => Promise<void>} onBulkExclude
 */
export function UnmatchedTable({ issues, onResolve, onBulkExclude }) {
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const openIssues = useMemo(() => issues.filter(i => i.status === 'open'), [issues]);
  const openIds = useMemo(() => new Set(openIssues.map(i => i.id)), [openIssues]);
  const selectedOpen = useMemo(
    () => Array.from(selected).filter(id => openIds.has(id)),
    [selected, openIds],
  );

  function toggleSel(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selectedOpen.length === openIssues.length) setSelected(new Set());
    else setSelected(new Set(openIssues.map(i => i.id)));
  }

  async function handleResolveSingle(issue, actionType, actionData) {
    if (!onResolve) return;
    setBusyId(issue.id);
    try { await onResolve(issue.id, actionType, actionData); setOpenId(null); }
    finally { setBusyId(null); }
  }

  async function handleBulk() {
    if (!onBulkExclude || selectedOpen.length === 0) return;
    setBulkBusy(true);
    try {
      await onBulkExclude(selectedOpen);
      setSelected(new Set());
      setConfirmBulk(false);
    } finally { setBulkBusy(false); }
  }

  return (
    <div className="card" style={{marginTop:16}}>
      {selectedOpen.length > 0 && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px', background:'var(--accent-soft)', borderRadius:8, marginBottom:12,
        }}>
          <span style={{fontSize:13, fontWeight:600, color:'var(--accent-text)'}}>
            <b>{selectedOpen.length}건</b> 선택됨
          </span>
          {confirmBulk ? (
            <span style={{display:'inline-flex', gap:6, alignItems:'center'}}>
              <span style={{fontSize:12, color:'var(--negative)'}}>선택한 항목을 모두 제외 처리할까요?</span>
              <button className="btn sm" onClick={() => setConfirmBulk(false)} disabled={bulkBusy}>취소</button>
              <button className="btn sm" onClick={handleBulk} disabled={bulkBusy}
                style={{background:'var(--negative)', color:'#fff', borderColor:'var(--negative)'}}>
                {bulkBusy ? '처리 중...' : '일괄 제외 확인'}
              </button>
            </span>
          ) : (
            <span style={{display:'inline-flex', gap:6}}>
              <button className="btn sm" onClick={() => setSelected(new Set())}>선택 해제</button>
              <button className="btn sm" onClick={() => setConfirmBulk(true)}
                style={{color:'var(--negative)'}}>
                선택 일괄 제외
              </button>
            </span>
          )}
        </div>
      )}

      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:40}}>
                <input
                  type="checkbox"
                  checked={openIssues.length > 0 && selectedOpen.length === openIssues.length}
                  onChange={toggleAll}
                />
              </th>
              <th style={{width:110}}>월</th>
              <th>대표 메뉴명 (원본)</th>
              <th>정규화 후</th>
              <th style={{width:110, textAlign:'right'}}>총 수량</th>
              <th style={{width:100, textAlign:'right'}}>영향 행</th>
              <th style={{width:100}}>상태</th>
              <th style={{width:90}}></th>
            </tr>
          </thead>
          <tbody>
            {issues.map(it => (
              <Row
                key={it.id}
                issue={it}
                expanded={openId === it.id}
                busy={busyId === it.id}
                checked={selected.has(it.id)}
                onCheck={() => toggleSel(it.id)}
                onToggle={() => setOpenId(openId === it.id ? null : it.id)}
                onSubmit={(at, ad) => handleResolveSingle(it, at, ad)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ issue, expanded, busy, checked, onCheck, onToggle, onSubmit }) {
  const canResolve = issue.status === 'open';
  return (
    <>
      <tr>
        <td>
          {canResolve && (
            <input type="checkbox" checked={checked} onChange={onCheck} />
          )}
        </td>
        <td><span className="period-pill num">{issue.year}.{String(issue.month).padStart(2, '0')}</span></td>
        <td className="cell-name"><div className="menu-name">{issue.representativeRawMenuName}</div></td>
        <td className="cell-name">
          <span style={{color:'var(--text-3)', fontSize:12}}>{issue.normalizedMenuName}</span>
        </td>
        <td className="num right">{formatNumber(issue.totalQuantity)}<span className="unit">개</span></td>
        <td className="num right">{formatNumber(issue.affectedRowCount)}</td>
        <td>
          {issue.status === 'open'
            ? <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)'}}>미해결</span>
            : <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)'}}>해결됨</span>}
        </td>
        <td style={{textAlign:'right'}}>
          {canResolve && (
            <button className="btn sm primary" onClick={onToggle} disabled={busy}>
              {expanded ? '닫기' : '해결'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{padding:0}}>
            <UnmatchedResolveForm issue={issue} onSubmit={onSubmit} onCancel={onToggle} busy={busy}/>
          </td>
        </tr>
      )}
    </>
  );
}
