/**
 * app/note/journal/_JournalTabs.jsx — 연구일지 화면 탭(작성 / 목록)
 *
 * 한 화면에 작성·목록·그날 기록이 길게 이어지던 것을 두 탭으로 나눴다.
 *   - 작성: 오늘 내용 보고서 + 그날 기록
 *   - 목록: 연구일지 목록(검색·필터·펼치기)
 * 고른 탭은 주소 ?tab=list로 남겨 새로고침해도 유지한다.
 */
'use client';
import { useEffect, useState } from 'react';

export const JOURNAL_TABS = [
  { id: 'write', label: '오늘 내용 보고서' },
  { id: 'list', label: '연구일지 목록' },
];

export function useJournalTab() {
  const [tab, setTabState] = useState('write');

  // 주소의 ?tab=list를 읽어 시작 탭을 정한다(서버 렌더와 어긋나지 않게 마운트 뒤에)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'list') setTabState('list');
  }, []);

  function setTab(next) {
    const safe = next === 'list' ? 'list' : 'write';
    setTabState(safe);
    const url = new URL(window.location.href);
    if (safe === 'list') url.searchParams.set('tab', 'list');
    else url.searchParams.delete('tab');
    window.history.replaceState(window.history.state, '', url);
  }

  return [tab, setTab];
}

export function JournalTabs({ tab, onTab, listCount }) {
  return (
    <div className="tabs" role="tablist" style={{ marginTop: 16, maxWidth: '100%' }}>
      {JOURNAL_TABS.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className={`tab ${tab === item.id ? 'active' : ''}`}
          onClick={() => onTab(item.id)}
        >
          {item.label}
          {item.id === 'list' && listCount > 0 ? ` (${listCount}일)` : ''}
        </button>
      ))}
    </div>
  );
}
