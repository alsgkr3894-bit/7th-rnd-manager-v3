'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { todayKey } from '@/app/note/calendar/_calendar-utils';
import { useTodayChecklist } from '@/app/note/calendar/useTodayChecklist';

const TAG_LABEL = { due: '마감임박' };
const LEAVE_MS = 240;
const noopLoad = async () => {};

/**
 * 캘린더의 "오늘 하루 체크리스트"를 홈 오늘 할 일에 그대로 연결한다 — 같은 저장소(localStorage)를
 * 읽고 쓰며, 체크하면 캘린더와 같은 방식으로 연구일지에도 기록된다(useTodayChecklist 재사용).
 */
function TodayChecklistSection({ today, canEdit }) {
  const { todayChecklist, checkInput, setCheckInput, addChecklistItem, toggleChecklistItem } =
    useTodayChecklist({ today, load: noopLoad, canEdit });
  const doneCount = todayChecklist.filter(item => item.done).length;
  return (
    <div className="todo-checklist" style={{ marginTop: 12 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>오늘 하루 체크리스트</div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          {doneCount}/{todayChecklist.length} 완료
        </div>
      </div>
      {todayChecklist.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '6px 0' }}>
          등록된 체크 항목이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
          {todayChecklist.map(item => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: canEdit ? 'pointer' : 'default',
                color: item.done ? 'var(--text-4)' : 'var(--text-2)',
              }}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(item.id)}
                disabled={!canEdit}
                style={{ accentColor: 'var(--positive)' }}
              />
              <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      )}
      {canEdit && (
        <form
          onSubmit={event => {
            event.preventDefault();
            addChecklistItem();
          }}
          style={{ display: 'flex', gap: 6 }}
        >
          <input
            className="form-input"
            value={checkInput}
            onChange={event => setCheckInput(event.target.value)}
            placeholder="오늘 할 일 입력"
            style={{ height: 32, fontSize: 12 }}
          />
          <button className="btn sm primary" type="submit" disabled={!checkInput.trim()}>
            추가
          </button>
        </form>
      )}
    </div>
  );
}

function normalizeDoneIds(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(id => typeof id === 'string' || typeof id === 'number');
}

/**
 * 오늘 할 일 — 마감 임박 일정.
 * 완료 상태는 localStorage(HOME_TODO_DONE)에 영속. 완료 시 실행취소 토스트 제공.
 *
 * @param {{ todos: Array, router, canEdit?: boolean }} props
 */
export function TodoWidget({ todos = [], router, canEdit = false }) {
  // 서버 렌더와 날짜가 어긋나지 않게 마운트 뒤에 오늘 날짜를 정한다
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(todayKey());
  }, []);
  const [doneIds, setDoneIds] = useState(
    () => new Set(normalizeDoneIds(getJSONLS(KEYS.HOME_TODO_DONE)))
  );
  const [leavingId, setLeavingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const leaveTimerRef = useRef(null);
  const safeTodos = useMemo(() => asObjectArray(todos), [todos]);

  const persist = useCallback(set => {
    setDoneIds(new Set(set));
    setJSONLS(KEYS.HOME_TODO_DONE, Array.from(set));
  }, []);

  useEffect(
    () => () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    },
    []
  );

  const pending = useMemo(() => safeTodos.filter(t => !doneIds.has(t.id)), [safeTodos, doneIds]);
  const counts = useMemo(
    () => ({
      all: pending.length,
      due: pending.filter(t => t.f === 'due').length,
    }),
    [pending]
  );

  const shown = filter === 'all' ? pending : pending.filter(t => t.f === filter);

  function complete(todo) {
    setLeavingId(todo.id);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      const next = new Set(doneIds);
      next.add(todo.id);
      persist(next);
      setLeavingId(null);
      showToast('완료 처리했어요', 'info', 4200, {
        label: '실행취소',
        onClick: () => {
          const back = new Set(doneIds);
          back.delete(todo.id);
          persist(back);
        },
      });
      leaveTimerRef.current = null;
    }, LEAVE_MS);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">오늘 할 일</div>
          <div className="card-sub">마감 임박 일정 · 오늘 하루 체크리스트</div>
        </div>
        <div className="seg">
          {['all', 'due'].map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? '전체' : '마감'} {counts[f]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="todo-empty">🎉 오늘 챙길 일을 모두 끝냈어요!</div>
      ) : (
        <div className="todo-list">
          {shown.map((t, index) => {
            const href = typeof t.href === 'string' ? t.href : null;
            const title = asDisplayText(t.title);
            const sub = asDisplayText(t.sub);
            const tag = TAG_LABEL[t.tag] ? t.tag : '';
            return (
              <button
                key={t.id ?? index}
                className={`todo${leavingId === t.id ? ' leaving' : ''}`}
                onClick={() => href && router?.push?.(href)}
              >
                <span
                  className="check"
                  role="checkbox"
                  aria-checked="false"
                  aria-label="완료 처리"
                  onClick={e => {
                    e.stopPropagation();
                    complete(t);
                  }}
                >
                  <Icon.check />
                </span>
                <span className="tmain">
                  <span className="ttitle">{title}</span>
                  {sub && <span className="tsub">{sub}</span>}
                </span>
                {tag && <span className={`tagchip ${tag}`}>{TAG_LABEL[tag]}</span>}
              </button>
            );
          })}
        </div>
      )}
      {today && <TodayChecklistSection today={today} canEdit={canEdit} />}
    </div>
  );
}
