'use client';
import { useReducer, useMemo, useState, useEffect } from 'react';
import { getClassificationNameOptions, CATEGORY_ORDER } from '@/lib/sales';
import { usePagination } from '@/hooks/usePagination';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { UnmatchedBulkActions } from './unmatched/UnmatchedBulkActions';
import { UnmatchedIssueTable } from './unmatched/UnmatchedIssueTable';

const initialState = {
  openId: null,
  busyId: null,
  selected: new Set(),
  confirmBulk: false,
  bulkBusy: false,
  showBulkRule: false,
  bulkRuleBusy: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_ROW':
      return { ...state, openId: state.openId === action.id ? null : action.id };
    case 'RESOLVE_START':
      return { ...state, busyId: action.id };
    case 'RESOLVE_DONE':
      return { ...state, busyId: null, openId: null };
    case 'RESOLVE_CLEAR_BUSY':
      return { ...state, busyId: null };
    case 'TOGGLE_SEL': {
      const next = new Set(state.selected);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selected: next };
    }
    case 'SEL_ALL':
      return { ...state, selected: action.ids };
    case 'SEL_CLEAR':
      return { ...state, selected: new Set() };
    case 'BULK_CONFIRM':
      return { ...state, confirmBulk: true, showBulkRule: false };
    case 'BULK_CANCEL':
      return { ...state, confirmBulk: false };
    case 'BULK_START':
      return { ...state, bulkBusy: true };
    case 'BULK_DONE':
      return { ...state, bulkBusy: false, selected: new Set(), confirmBulk: false };
    case 'BULK_ERROR':
      return { ...state, bulkBusy: false };
    case 'BULK_RULE_SHOW':
      return { ...state, showBulkRule: true, confirmBulk: false };
    case 'BULK_RULE_HIDE':
      return { ...state, showBulkRule: false };
    case 'BULK_RULE_START':
      return { ...state, bulkRuleBusy: true };
    case 'BULK_RULE_DONE':
      return { ...state, bulkRuleBusy: false, showBulkRule: false, selected: new Set() };
    case 'BULK_RULE_ERROR':
      return { ...state, bulkRuleBusy: false };
    default:
      return state;
  }
}

export function UnmatchedTable({ issues, canEdit = false, onResolve, onBulkExclude, onBulkRule }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { openId, busyId, selected, confirmBulk, bulkBusy, showBulkRule, bulkRuleBusy } = state;
  const safeIssues = useMemo(() => asObjectArray(issues), [issues]);
  const handleResolve = typeof onResolve === 'function' ? onResolve : null;
  const handleBulkExclude = typeof onBulkExclude === 'function' ? onBulkExclude : null;
  const handleBulkRule = typeof onBulkRule === 'function' ? onBulkRule : null;

  const [bulkRuleCat, setBulkRuleCat] = useState(CATEGORY_ORDER[0] || '');
  const [bulkRuleGroup, setBulkRuleGroup] = useState('');
  const [bulkRuleDetail, setBulkRuleDetail] = useState('');
  const [nameOpts, setNameOpts] = useState({});

  useEffect(() => {
    let ignore = false;

    getClassificationNameOptions()
      .then(opts => {
        if (!ignore) setNameOpts(opts);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const openIssues = useMemo(
    () => safeIssues.filter(i => i.status === 'open' && i.id != null),
    [safeIssues]
  );
  const openIds = useMemo(() => new Set(openIssues.map(i => i.id)), [openIssues]);
  const {
    page: umPage,
    goTo: umGoTo,
    totalPages: umTotalPages,
    paged: umPaged,
    total: umTotal,
  } = usePagination(safeIssues, 50);
  const selectedOpen = useMemo(
    () => Array.from(selected).filter(id => openIds.has(id)),
    [selected, openIds]
  );

  const catOpts = nameOpts[bulkRuleCat] || { groupNames: [], detailNames: [] };
  const allOpenSelected = selectedOpen.length === openIssues.length;

  function toggleSel(id) {
    if (!canEdit) return;
    dispatch({ type: 'TOGGLE_SEL', id });
  }

  function toggleAll() {
    if (!canEdit) return;
    dispatch(
      allOpenSelected
        ? { type: 'SEL_CLEAR' }
        : { type: 'SEL_ALL', ids: new Set(openIssues.map(i => i.id)) }
    );
  }

  async function handleResolveSingle(issue, actionType, actionData) {
    if (!canEdit || !handleResolve || !issue || issue.id == null) return;
    dispatch({ type: 'RESOLVE_START', id: issue.id });
    let succeeded = false;
    try {
      await handleResolve(issue.id, actionType, actionData);
      succeeded = true;
    } finally {
      dispatch({ type: succeeded ? 'RESOLVE_DONE' : 'RESOLVE_CLEAR_BUSY' });
    }
  }

  async function handleBulk() {
    if (!canEdit || !handleBulkExclude || selectedOpen.length === 0) return;
    dispatch({ type: 'BULK_START' });
    try {
      await handleBulkExclude(selectedOpen);
      dispatch({ type: 'BULK_DONE' });
    } catch {
      dispatch({ type: 'BULK_ERROR' });
    }
  }

  async function handleBulkRuleApply() {
    if (!canEdit || !handleBulkRule || selectedOpen.length === 0) return;
    dispatch({ type: 'BULK_RULE_START' });
    try {
      await handleBulkRule(selectedOpen, {
        category: bulkRuleCat,
        groupName: bulkRuleGroup,
        detailName: bulkRuleDetail,
      });
      dispatch({ type: 'BULK_RULE_DONE' });
    } catch {
      dispatch({ type: 'BULK_RULE_ERROR' });
    }
  }

  function handleBulkRuleCatChange(nextCategory) {
    setBulkRuleCat(nextCategory);
    setBulkRuleGroup('');
    setBulkRuleDetail('');
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <UnmatchedBulkActions
        selectedCount={selectedOpen.length}
        confirmBulk={confirmBulk}
        bulkBusy={bulkBusy}
        showBulkRule={showBulkRule}
        bulkRuleBusy={bulkRuleBusy}
        bulkRuleCat={bulkRuleCat}
        bulkRuleGroup={bulkRuleGroup}
        bulkRuleDetail={bulkRuleDetail}
        categoryOptions={catOpts}
        canEdit={canEdit}
        onClearSelection={() => dispatch({ type: 'SEL_CLEAR' })}
        onCancelBulkConfirm={() => dispatch({ type: 'BULK_CANCEL' })}
        onConfirmBulkExclude={handleBulk}
        onToggleBulkRule={() =>
          dispatch({ type: showBulkRule ? 'BULK_RULE_HIDE' : 'BULK_RULE_SHOW' })
        }
        onAskBulkExclude={() => dispatch({ type: 'BULK_CONFIRM' })}
        onBulkRuleCatChange={handleBulkRuleCatChange}
        onBulkRuleGroupChange={setBulkRuleGroup}
        onBulkRuleDetailChange={setBulkRuleDetail}
        onCancelBulkRule={() => dispatch({ type: 'BULK_RULE_HIDE' })}
        onApplyBulkRule={handleBulkRuleApply}
      />
      <UnmatchedIssueTable
        pagedIssues={umPaged}
        openIssuesCount={openIssues.length}
        allOpenSelected={allOpenSelected}
        selected={selected}
        openId={openId}
        busyId={busyId}
        page={umPage}
        totalPages={umTotalPages}
        total={umTotal}
        onPage={umGoTo}
        onToggleAll={toggleAll}
        onToggleSelected={toggleSel}
        onToggleRow={id => dispatch({ type: 'TOGGLE_ROW', id })}
        onResolveSingle={handleResolveSingle}
        canEdit={canEdit}
      />
    </div>
  );
}
