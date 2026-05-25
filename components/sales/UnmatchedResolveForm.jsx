'use client';
import { useMemo, useState } from 'react';
import { suggestRulesByMenuName, CATEGORY_ORDER as CATEGORY_OPTIONS } from '@/lib/sales';

/**
 * UnmatchedResolveForm — 미매칭 issue 해결 인라인 폼
 *
 * @param {{ id, normalizedMenuName, representativeRawMenuName }} issue
 * @param {(actionType, actionData) => Promise<void>} onSubmit
 * @param {() => void} onCancel
 * @param {boolean} busy
 */
export function UnmatchedResolveForm({ issue, onSubmit, onCancel, busy }) {
  const [actionType, setActionType] = useState('alias'); // alias | rule | exclude
  const [outputName, setOutputName] = useState('');
  const [ruleCategory, setRuleCategory] = useState('피자');
  const [ruleGroup, setRuleGroup] = useState('');
  const [ruleDetail, setRuleDetail] = useState('');

  // 자동 추천 (정규화된 메뉴명 기반)
  const suggestions = useMemo(
    () => suggestRulesByMenuName(issue.normalizedMenuName || '', 5),
    [issue.normalizedMenuName],
  );

  function applySuggestion(rule) {
    if (actionType === 'alias') {
      setOutputName(rule.pattern || rule.detailName || rule.groupName || '');
    } else if (actionType === 'rule') {
      setRuleCategory(rule.category || '피자');
      setRuleGroup(rule.groupName || '');
      setRuleDetail(rule.detailName || '');
    }
  }

  function handleSubmit() {
    if (actionType === 'alias') {
      if (!outputName.trim()) return;
      onSubmit('alias', { outputName: outputName.trim() });
    } else if (actionType === 'rule') {
      if (!ruleCategory || !ruleGroup.trim()) return;
      onSubmit('rule', {
        category: ruleCategory,
        groupName: ruleGroup.trim(),
        detailName: ruleDetail.trim() || ruleGroup.trim(),
      });
    } else {
      onSubmit('exclude', {});
    }
  }

  return (
    <div style={{
      padding:'14px 18px', background:'var(--surface-2)',
      borderTop:'1px solid var(--border)',
    }}>
      <div style={{display:'flex', gap:6, marginBottom:10}}>
        <ActionTab label="별칭 등록"   active={actionType === 'alias'}   onClick={() => setActionType('alias')}/>
        <ActionTab label="규칙 등록"   active={actionType === 'rule'}    onClick={() => setActionType('rule')}/>
        <ActionTab label="제외 처리"   active={actionType === 'exclude'} onClick={() => setActionType('exclude')}/>
      </div>

      {(actionType === 'alias' || actionType === 'rule') && suggestions.length > 0 && (
        <div style={{marginBottom:10, padding:'8px 10px', background:'var(--surface)', borderRadius:6, border:'1px solid var(--border)'}}>
          <div style={{fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:6}}>
            추천 — 비슷한 메뉴의 기존 룰 (클릭 시 자동 채움)
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {suggestions.map(({ rule }) => (
              <button
                key={rule.ruleId}
                onClick={() => applySuggestion(rule)}
                className="chip"
                style={{
                  cursor:'pointer', border:'1px solid var(--border)',
                  background:'var(--surface-2)', color:'var(--text-2)', fontSize:11,
                  display:'inline-flex', alignItems:'center', gap:4,
                }}
                title={`pattern: ${rule.pattern}`}
              >
                <b style={{color:'var(--accent-text)'}}>{rule.category}</b>
                <span style={{color:'var(--text-3)'}}>/</span>
                <span>{rule.groupName}</span>
                {rule.detailName && rule.detailName !== rule.groupName && (
                  <span style={{color:'var(--text-4)', fontSize:10}}>· {rule.detailName}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {actionType === 'alias' && (
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <span style={{fontSize:13, color:'var(--text-3)'}}>표준 메뉴명:</span>
          <input
            value={outputName}
            onChange={e => setOutputName(e.target.value)}
            placeholder="예: 슈퍼콤비네이션 L"
            style={inputStyle}
          />
        </div>
      )}

      {actionType === 'rule' && (
        <div style={{display:'grid', gridTemplateColumns:'160px 1fr 1fr', gap:8}}>
          <select value={ruleCategory} onChange={e => setRuleCategory(e.target.value)} style={inputStyle}>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={ruleGroup}
            onChange={e => setRuleGroup(e.target.value)}
            placeholder="중분류명 (groupName)"
            style={inputStyle}
          />
          <input
            value={ruleDetail}
            onChange={e => setRuleDetail(e.target.value)}
            placeholder="상세 (비우면 중분류와 동일)"
            style={inputStyle}
          />
        </div>
      )}

      {actionType === 'exclude' && (
        <div style={{fontSize:13, color:'var(--text-3)'}}>
          이 메뉴를 통계에서 제외합니다 — <b>{issue.normalizedMenuName}</b>
        </div>
      )}

      <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
        <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
        <button
          className="btn primary sm"
          onClick={handleSubmit}
          disabled={busy
            || (actionType === 'alias' && !outputName.trim())
            || (actionType === 'rule' && (!ruleCategory || !ruleGroup.trim()))}
        >
          {busy ? '처리 중...' : '해결'}
        </button>
      </div>
    </div>
  );
}

function ActionTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:'6px 12px', borderRadius:6, fontSize:12, fontWeight:600,
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-2)',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
        cursor:'pointer',
      }}
    >{label}</button>
  );
}

const inputStyle = {
  padding:'6px 10px', borderRadius:6,
  border:'1px solid var(--border)', background:'var(--surface)',
  color:'var(--text-1)', fontSize:13,
};
