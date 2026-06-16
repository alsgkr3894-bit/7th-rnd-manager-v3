'use client';
import { useState, useMemo, useEffect } from 'react';
import { UsageSummaryBar } from './usage-view/UsageSummaryBar';
import { UsageTable } from './usage-view/UsageTable';
import { UsageToolbar } from './usage-view/UsageToolbar';
import {
  buildIngredientUsageRows,
  getUsageRowsSummary,
  sortIngredientUsageRows,
} from './usage-view/usageViewUtils';

export function UsageView({ rows, usageMap, usageCat, setUsageCat, usageSort, setUsageSort }) {
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [usageCat]);

  const usageRows = useMemo(
    () => buildIngredientUsageRows({ rows, usageMap, usageCat }),
    [rows, usageMap, usageCat]
  );
  const sorted = useMemo(() => sortIngredientUsageRows(usageRows, usageSort), [usageRows, usageSort]);
  const menuCounts = useMemo(() => getUsageRowsSummary(sorted), [sorted]);

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <>
      <UsageSummaryBar usageCount={sorted.length} menuCounts={menuCounts} />
      <UsageToolbar
        usageCat={usageCat}
        usageSort={usageSort}
        sortedRows={sorted}
        onUsageCat={setUsageCat}
        onUsageSort={setUsageSort}
        onExpandAll={() => setExpanded(new Set(sorted.map(row => row.uid)))}
        onCollapseAll={() => setExpanded(new Set())}
      />
      <UsageTable
        rows={sorted}
        expanded={expanded}
        usageSort={usageSort}
        usageCat={usageCat}
        onToggle={toggle}
      />
    </>
  );
}
