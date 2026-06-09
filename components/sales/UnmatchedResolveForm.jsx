'use client';
import { useEffect, useMemo, useState } from 'react';
import { suggestRulesByMenuName, getClassificationNameOptions, CATEGORY_ORDER as CATEGORY_OPTIONS } from '@/lib/sales';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ComboBox } from '@/components/ui/ComboBox';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * UnmatchedResolveForm — 미매칭 issue 해결 인라인 폼
 *
 * @param {{ id, normalizedMenuName, representativeRawMenuName }} issue
 * @param {(actionType, actionData) => Promise<void>} onSubmit
 * @param {() => void} onCancel
 * @param {boolean} busy
 */
export function UnmatchedResolveForm({ issue, onSubmit, onCancel, busy }) {
  const safeIssue = issue && typeof issue === 'object' ? issue : {};
  const normalizedMenuName = asDisplayText(safeIssue.normalizedMenuName, '-');
  const handleSubmitAction = typeof onSubmit === 'function' ? onSubmit : () => {};
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;
  const [actionType, setActionType] = useState('alias'); // alias | rule | exclude
  const [outputName, setOutputName] = useState('');
  const [ruleCategory, setRuleCategory] = useState('피자');
  const [ruleGroup, setRuleGroup] = useState('');
  const [ruleDetail, setRuleDetail] = useState('');
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [nameOpts, setNameOpts] = useState({ groupNames: [], detailNames: [], byCategory: {} });

  // 선택한 대분류(ruleCategory)에 속한 중분류·상세만 자동완성 후보로
  const catOpts = nameOpts.byCategory?.[ruleCategory] || { groupNames: [], detailNames: [] };

  // 자동 추천 (정규화된 메뉴명 기반)
  const suggestions = useMemo(
    () => asObjectArray(suggestRulesByMenuName(normalizedMenuName === '-' ? '' : normalizedMenuName, 5)),
    [normalizedMenuName],
  );

  // 중분류·상세 자동완성 후보 (기존 규칙의 groupName/detailName)
  useEffect(() => {
    let alive = true;
    getClassificationNameOptions()
      .then(opts => { if (alive) setNameOpts(opts); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function applySuggestion(rule) {
    const safeRule = rule && typeof rule === 'object' ? rule : {};
    if (actionType === 'alias') {
      setOutputName(asDisplayText(safeRule.pattern || safeRule.detailName || safeRule.groupName));
    } else if (actionType === 'rule') {
      setRuleCategory(asDisplayText(safeRule.category, '피자'));
      setRuleGroup(asDisplayText(safeRule.groupName));
      setRuleDetail(asDisplayText(safeRule.detailName));
    }
  }

  function handleSubmit() {
    if (actionType === 'alias') {
      if (!outputName.trim()) return;
      handleSubmitAction('alias', { outputName: outputName.trim() });
    } else if (actionType === 'rule') {
      if (!ruleCategory || !ruleGroup.trim()) return;
      handleSubmitAction('rule', {
        category: ruleCategory,
        groupName: ruleGroup.trim(),
        detailName: ruleDetail.trim() || ruleGroup.trim(),
      });
    } else {
      setConfirmExclude(true);
    }
  }

  return (
    <div style={{
      padding:'14px 18px', background:'var(--surface-2)',
      borderTop:'1px solid var(--border)',
    }}>
      <ConfirmDialog
        open={confirmExclude}
        title="제외 처리하시겠어요?"
        message={`"${normalizedMenuName}" 메뉴가 통계에서 제외됩니다. 이 작업은 되돌리기 어렵습니다.`}
        confirmLabel="제외 처리" cancelLabel="취소" danger
        onConfirm={() => { setConfirmExclude(false); handleSubmitAction('exclude', {}); }}
        onCancel={() => setConfirmExclude(false)}
      />
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
            {suggestions.map(({ rule }, index) => {
              const ruleId = asDisplayText(rule?.ruleId, `rule-${index}`);
              const pattern = asDisplayText(rule?.pattern);
              const category = asDisplayText(rule?.category, '-');
              const groupName = asDisplayText(rule?.groupName, '-');
              const detailName = asDisplayText(rule?.detailName);

              return (
              <button
                key={ruleId}
                onClick={() => applySuggestion(rule)}
                className="chip"
                style={{
                  cursor:'pointer', border:'1px solid var(--border)',
                  background:'var(--surface-2)', color:'var(--text-2)', fontSize:11,
                  display:'inline-flex', alignItems:'center', gap:4,
                }}
                title={`pattern: ${pattern}`}
              >
                <b style={{color:'var(--accent-text)'}}>{category}</b>
                <span style={{color:'var(--text-3)'}}>/</span>
                <span>{groupName}</span>
                {detailName && detailName !== groupName && (
                  <span style={{color:'var(--text-4)', fontSize:10}}>· {detailName}</span>
                )}
              </button>
              );
            })}
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
          <ComboBox
            value={ruleGroup}
            onChange={setRuleGroup}
            options={catOpts.groupNames}
            placeholder="중분류명 (groupName)"
            inputStyle={inputStyle}
          />
          <ComboBox
            value={ruleDetail}
            onChange={setRuleDetail}
            options={catOpts.detailNames}
            placeholder="상세 (비우면 중분류와 동일)"
            inputStyle={inputStyle}
          />
        </div>
      )}

      {actionType === 'exclude' && (
        <div style={{fontSize:13, color:'var(--text-3)'}}>
          이 메뉴를 통계에서 제외합니다 — <b>{normalizedMenuName}</b>
        </div>
      )}

      <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
        <button className="btn sm" onClick={handleCancel} disabled={busy}>취소</button>
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
