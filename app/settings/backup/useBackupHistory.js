'use client';
import { useEffect, useMemo, useState } from 'react';
import { MODULE_GROUPS } from '@/lib/db';
import { getHistory, getLastBackupAt, getBackupReminder } from '@/lib/backup-history';

export function useBackupHistory() {
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // all | pinned | week
  const [backupReminder, setBackupReminder] = useState(null);

  useEffect(() => {
    setHistory(getHistory());
    setLastBackupAt(getLastBackupAt());
    setBackupReminder(getBackupReminder());
  }, []);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        if (!a.pinned !== !b.pinned) return a.pinned ? -1 : 1;
        return (b.at || '').localeCompare(a.at || '');
      }),
    [history]
  );

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sortedHistory.filter(h => {
      if (historyFilter === 'pinned' && !h.pinned) return false;
      if (historyFilter === 'week' && new Date(h.at).getTime() < weekAgo) return false;
      if (!q) return true;
      const scopeText = (h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(' ');
      return (
        String(h.id || '').toLowerCase().includes(q) ||
        String(h.fileName || '').toLowerCase().includes(q) ||
        scopeText.toLowerCase().includes(q)
      );
    });
  }, [historyFilter, historyQuery, sortedHistory]);

  function refreshHistory() {
    setHistory(getHistory());
  }

  return {
    history,
    setHistory,
    historyQuery,
    setHistoryQuery,
    historyFilter,
    setHistoryFilter,
    sortedHistory,
    filteredHistory,
    backupReminder,
    lastBackupAt,
    setLastBackupAt,
    refreshHistory,
  };
}
