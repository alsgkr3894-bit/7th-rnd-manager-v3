'use client';
import { useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';

const TAG_LABEL = { report: '보고예정', due: '마감임박' };
const LEAVE_MS = 240;

/**
 * 오늘 할 일 — 보고예정 노트 + 마감 임박 일정.
 * 완료 상태는 localStorage(HOME_TODO_DONE)에 영속. 완료 시 실행취소 토스트 제공.
 *
 * @param {{ todos: Array, router }} props
 */
export function TodoWidget({ todos = [], router }) {
  const [doneIds, setDoneIds] = useState(() => new Set(getJSONLS(KEYS.HOME_TODO_DONE) || []));
  const [leavingId, setLeavingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const persist = useCallback((set) => {
    setDoneIds(new Set(set));
    setJSONLS(KEYS.HOME_TODO_DONE, Array.from(set));
  }, []);

  const pending = useMemo(() => todos.filter(t => !doneIds.has(t.id)), [todos, doneIds]);
  const counts = useMemo(() => ({
    all: pending.length,
    report: pending.filter(t => t.f === 'report').length,
    due: pending.filter(t => t.f === 'due').length,
  }), [pending]);

  const shown = filter === 'all' ? pending : pending.filter(t => t.f === filter);

  function complete(todo) {
    setLeavingId(todo.id);
    setTimeout(() => {
      const next = new Set(doneIds); next.add(todo.id);
      persist(next);
      setLeavingId(null);
      showToast('완료 처리했어요', 'info', 4200, {
        label: '실행취소',
        onClick: () => { const back = new Set(doneIds); back.delete(todo.id); persist(back); },
      });
    }, LEAVE_MS);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">오늘 할 일 · 보고예정</div>
          <div className="card-sub">보고예정 노트 · 마감 임박 일정</div>
        </div>
        <div className="seg">
          {['all', 'report', 'due'].map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? '전체' : f === 'report' ? '보고' : '마감'} {counts[f]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="todo-empty">🎉 오늘 챙길 일을 모두 끝냈어요!</div>
      ) : (
        <div className="todo-list">
          {shown.map(t => (
            <button key={t.id} className={`todo${leavingId === t.id ? ' leaving' : ''}`}
              onClick={() => router.push(t.href)}>
              <span className="check"
                role="checkbox" aria-checked="false" aria-label="완료 처리"
                onClick={(e) => { e.stopPropagation(); complete(t); }}>
                <Icon.check />
              </span>
              <span className="tmain">
                <span className="ttitle">{t.title}</span>
                <span className="tsub">{t.sub}</span>
              </span>
              <span className={`tagchip ${t.tag}`}>{TAG_LABEL[t.tag]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
