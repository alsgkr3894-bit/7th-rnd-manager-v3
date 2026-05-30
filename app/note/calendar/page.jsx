'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { getAllNotes } from '@/lib/note';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note/constants';
import {
  getAllSchedules, addSchedule, updateSchedule, deleteSchedule,
  SCHEDULE_TYPES, SCHEDULE_COLORS,
} from '@/lib/note/schedules';
import { getAllWorkLogs, WORK_LOG_TYPES, pruneOldWorkLogs, WORK_LOG_RETENTION_DAYS } from '@/lib/work-log';
import { ScheduleModal } from './_ScheduleModal';
import { DayPanel } from './_DayPanel';
import { CalendarSkeleton } from './_CalendarSkeleton';

/* ── 유틸 ─────────────────────────────────────────────────── */
const pad   = n => String(n).padStart(2, '0');
const toKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// todayKey 캐싱 — 같은 날이면 재계산 없이 반환 (렌더당 70+ 호출 방지)
let _todayCache = '', _todayCacheNum = 0;
function todayKey() {
  const t = new Date();
  const n = t.getFullYear() * 10000 + (t.getMonth()+1) * 100 + t.getDate();
  if (n !== _todayCacheNum) { _todayCacheNum = n; _todayCache = toKey(t.getFullYear(), t.getMonth()+1, t.getDate()); }
  return _todayCache;
}

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function firstDow(y, m)    { return new Date(y, m-1, 1).getDay(); }
const isPast  = (key, today) => key < today;
const isToday = (key, today) => key === today;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 노트 상태 도트 색 ─────────────────────────────────────── */
const NOTE_DOT = {
  '아이디어': '#9CA3AF',
  '테스트중': 'var(--accent)',
  '재테스트': 'var(--warn)',
  '보고예정': '#7C3AED',
  '보류':     '#9CA3AF',
  '출시':     'var(--positive)',
  '폐기':     'var(--negative)',
};

/* ── 메인 페이지 ─────────────────────────────────────────── */
export default function Page() {
  const router = useRouter();

  const [notes,       setNotes]       = useState([]);
  const [schedules,   setSchedules]   = useState([]);
  const [workLogs,    setWorkLogs]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [viewYear,    setViewYear]    = useState(() => new Date().getFullYear());
  const [viewMonth,   setViewMonth]   = useState(() => new Date().getMonth()+1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [viewMode,    setViewMode]    = useState('all'); // 'all' | 'notes' | 'schedules'
  const [modal,       setModal]       = useState(null);  // null | { mode: 'add'|'edit', schedule?, date? }
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [monthDir,    setMonthDir]    = useState(0);     // -1 | 0 | 1 (animation direction)
  const calKey      = useRef(0);
  const isAnimating = useRef(false);  // 월 이동 중 연속 클릭 방지

  const today = useMemo(() => todayKey(), []); // 마운트 시 1회 계산 (캐시 함수가 자정에도 갱신)

  const load = useCallback(async () => {
    await initDB();
    await pruneOldWorkLogs(WORK_LOG_RETENTION_DAYS);
    const [ns, ss, wl] = await Promise.all([getAllNotes(), getAllSchedules(), getAllWorkLogs()]);
    setNotes(ns);
    setSchedules(ss);
    setWorkLogs(wl);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  /* 달 이동 — 애니메이션 중 연속 클릭 방지 */
  const shiftMonth = useCallback((delta) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setTimeout(() => { isAnimating.current = false; }, 250);

    setMonthDir(delta);
    calKey.current += 1;
    setViewMonth(prev => {
      let m = prev + delta;
      if (m < 1)  { setViewYear(y => y - 1); return 12; }
      if (m > 12) { setViewYear(y => y + 1); return 1; }
      return m;
    });
    setSelectedDay(null);
  }, []);

  /* 키보드: ← → 월 이동 / Escape 패널 닫기 */
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  shiftMonth(-1);
      if (e.key === 'ArrowRight') shiftMonth(1);
      if (e.key === 'Escape' && selectedDay) closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDay, shiftMonth]);

  /* 패널 닫기 — fade-out 후 상태 해제 */
  function closePanel() {
    if (panelClosing) return;
    setPanelClosing(true);
    setTimeout(() => { setSelectedDay(null); setPanelClosing(false); }, 180);
  }

  /* 날짜 맵 */
  const notesByDate = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      const k = n.testDate?.slice(0, 10);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(n);
    }
    return map;
  }, [notes]);

  const workLogsByDate = useMemo(() => {
    const map = new Map();
    for (const w of workLogs) {
      const k = w.date?.slice(0, 10);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(w);
    }
    return map;
  }, [workLogs]);

  const schedulesByDate = useMemo(() => {
    const map = new Map();
    for (const s of schedules) {
      const k = s.date?.slice(0, 10);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    return map;
  }, [schedules]);

  /* 이달 통계 */
  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    let noteDone = 0, noteScheduled = 0, eventTotal = 0;
    for (const [k, ns] of notesByDate) {
      if (!k.startsWith(prefix)) continue;
      isPast(k, today) ? (noteDone += ns.length) : (noteScheduled += ns.length);
    }
    for (const [k, ss] of schedulesByDate) {
      if (k.startsWith(prefix)) eventTotal += ss.length;
    }
    return { noteDone, noteScheduled, eventTotal };
  }, [notesByDate, schedulesByDate, viewMonth, viewYear, today]);

  /* 달력 셀 목록 */
  const fd = firstDow(viewYear, viewMonth);
  const dim = daysInMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((fd + dim) / 7) * 7;

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - fd + 1;
      if (dayNum < 1 || dayNum > dim) { arr.push(null); continue; }
      const key = toKey(viewYear, viewMonth, dayNum);
      const ns  = notesByDate.get(key)     || [];
      const ss  = schedulesByDate.get(key) || [];
      arr.push({ dayNum, key, notes: ns, schedules: ss, dow: i % 7 });
    }
    return arr;
  }, [viewYear, viewMonth, totalCells, fd, dim, notesByDate, schedulesByDate]);

  /* 선택 날짜 항목 */
  const selectedNotes    = useMemo(() => selectedDay ? (notesByDate.get(selectedDay)     || []) : [], [selectedDay, notesByDate]);
  const selectedSchedules = useMemo(() => selectedDay ? (schedulesByDate.get(selectedDay) || []) : [], [selectedDay, schedulesByDate]);
  const selectedWorkLogs = useMemo(() => selectedDay ? (workLogsByDate.get(selectedDay)  || []) : [], [selectedDay, workLogsByDate]);

  /* 일정 저장 */
  async function handleSaveSchedule(data) {
    try {
      if (modal?.mode === 'edit' && modal.schedule?.id) {
        await updateSchedule(modal.schedule.id, data);
        showToast('일정이 수정됐습니다', 'ok');
      } else {
        await addSchedule(data);
        showToast('일정이 추가됐습니다', 'ok');
      }
      await load();
      if (data.date) setSelectedDay(data.date);
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'err');
    }
    setModal(null);
  }

  function handleDeleteSchedule() {
    if (!modal?.schedule?.id) return;
    setConfirmDel(true);
  }

  async function confirmDeleteSchedule() {
    setConfirmDel(false);
    try {
      await deleteSchedule(modal.schedule.id);
      showToast('삭제됐습니다', 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'err');
    }
    setModal(null);
  }

  if (loading) return (
    <main className="main">
      <PageHeader breadcrumb={['메뉴개발노트', '일정 달력']} title="일정 달력"/>
      <CalendarSkeleton/>
    </main>
  );

  const animClass = monthDir > 0 ? 'cal-slide-left' : monthDir < 0 ? 'cal-slide-right' : 'cal-fade';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '일정 달력']}
        title="일정 달력"
        sub="테스트 일지와 일정을 달력에서 함께 관리합니다"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn"
              onClick={() => setModal({ mode:'add', date: selectedDay || today })}>
              <Icon.plus style={{ width:14, height:14 }}/> 일정 추가
            </button>
            <button className="btn primary" onClick={() => router.push('/note/write')}>
              <Icon.plus style={{ width:14, height:14 }}/> 새 노트
            </button>
          </div>
        }
      />

      {/* 컨트롤 바 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        {/* 월 네비 */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button className="btn sm" onClick={() => shiftMonth(-1)}>
            <Icon.chevLeft style={{ width:14, height:14 }}/>
          </button>
          <span style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.03em', minWidth:108, textAlign:'center' }}>
            {viewYear}년 {viewMonth}월
          </span>
          <button className="btn sm" onClick={() => shiftMonth(1)}>
            <Icon.chevRight style={{ width:14, height:14 }}/>
          </button>
          <button className="btn sm ghost" style={{ fontSize:11 }}
            onClick={() => { setViewYear(new Date().getFullYear()); setViewMonth(new Date().getMonth()+1); setSelectedDay(null); }}>
            오늘
          </button>
        </div>

        {/* 통계 */}
        <div style={{ display:'flex', gap:10, marginLeft:'auto', flexWrap:'wrap' }}>
          {monthStats.noteDone > 0 && (
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>
              테스트 <b style={{ color:'var(--text-1)' }}>{monthStats.noteDone}</b>건
            </span>
          )}
          {monthStats.noteScheduled > 0 && (
            <span style={{ fontSize:12, color:'var(--accent-text)', fontWeight:600 }}>
              예정 <b>{monthStats.noteScheduled}</b>건
            </span>
          )}
          {monthStats.eventTotal > 0 && (
            <span style={{ fontSize:12, color:'#7C3AED', fontWeight:600 }}>
              일정 <b>{monthStats.eventTotal}</b>건
            </span>
          )}
        </div>

        {/* 뷰 모드 */}
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
          {[['all','전체'],['notes','노트'],['schedules','일정']].map(([k, l]) => (
            <button key={k} onClick={() => setViewMode(k)}
              style={{
                padding:'5px 13px', fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
                background: viewMode===k ? 'var(--accent)' : 'var(--surface-2)',
                color: viewMode===k ? '#fff' : 'var(--text-3)',
                transition:'background 0.12s',
              }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap:14, alignItems:'start' }}>

        {/* ── 달력 그리드 ── */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* 요일 헤더 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--divider)' }}>
            {WEEKDAYS.map((w,i) => (
              <div key={w} style={{
                padding:'10px 0', textAlign:'center',
                fontSize:11, fontWeight:800, letterSpacing:'0.03em',
                color: i===0 ? '#EF4444' : i===6 ? '#3B82F6' : 'var(--text-3)',
              }}>{w}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div key={calKey.current}
            className={animClass}
            style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {cells.map((cell, idx) => {
              if (!cell) return (
                <div key={idx} style={{ minHeight:90, background:'var(--surface-2)', borderRight:'1px solid var(--divider)', borderBottom:'1px solid var(--divider)' }}/>
              );
              const { dayNum, key, notes: cNotes, schedules: cSched, dow } = cell;
              const cLogs    = workLogsByDate.get(key) || [];
              const visNotes = viewMode==='schedules' ? [] : cNotes;
              const visSched = viewMode==='notes'     ? [] : cSched;
              const isSelected = selectedDay === key;
              const hasToday   = isToday(key, today);
              const past       = isPast(key, today);
              const total = visNotes.length + visSched.length;
              const MAX = 3;
              // _kind 명시로 일정/노트 구분을 안전하게
              const shown = [
                ...visSched.map(s => ({ ...s, _kind: 'schedule' })),
                ...visNotes.map(n => ({ ...n, _kind: 'note' })),
              ].slice(0, MAX);
              const overflow = total - MAX;

              return (
                <div key={key}
                  onClick={() => isSelected ? closePanel() : setSelectedDay(key)}
                  style={{
                    minHeight:90, padding:'5px 6px',
                    borderRight:'1px solid var(--divider)',
                    borderBottom:'1px solid var(--divider)',
                    cursor:'pointer',
                    background: isSelected
                      ? 'var(--accent-soft)'
                      : hasToday
                      ? 'color-mix(in oklab, var(--accent-soft) 35%, var(--surface))'
                      : 'var(--surface)',
                    transition:'background 0.12s',
                    position:'relative',
                  }}>
                  {/* 날짜 숫자 */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{
                      width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight: hasToday ? 800 : 600,
                      background: hasToday ? 'var(--accent)' : 'transparent',
                      color: hasToday ? '#fff' : dow===0 ? '#EF4444' : dow===6 ? '#3B82F6'
                        : past ? 'var(--text-4)' : 'var(--text-1)',
                    }}>{dayNum}</span>
                    {/* 일정 추가 버튼 */}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedDay(key); setModal({ mode:'add', date:key }); }}
                      style={{
                        width:18, height:18, borderRadius:5, border:'none', background:'transparent',
                        color:'var(--text-4)', cursor:'pointer', fontSize:14, lineHeight:1,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        opacity:0,
                      }}
                      className="cal-add-btn"
                      title="일정 추가">+</button>
                  </div>

                  {/* 항목 칩 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    {shown.map((item) => {
                      if (item._kind === 'schedule') {
                        const c = SCHEDULE_COLORS[item.type] || SCHEDULE_COLORS['기타'];
                        return (
                          <button key={`s${item.id}`}
                            onClick={e => { e.stopPropagation(); setModal({ mode:'edit', schedule:item }); }}
                            title={`[${item.type}] ${item.title}${item.time ? ' '+item.time : ''}`}
                            style={{
                              fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4,
                              background:c.bg, color:c.text,
                              borderLeft:`2px solid ${c.border}`,
                              border:`1px solid transparent`, borderLeftWidth:2, borderLeftColor:c.border,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              cursor:'pointer', textAlign:'left', width:'100%',
                            }}>
                            {item.time ? `${item.time} ` : ''}{item.title}
                          </button>
                        );
                      } else {
                        const sc = STATUS_COLORS[item.status] || STATUS_COLORS['아이디어'];
                        const sb = STATUS_BORDER[item.status] || 'var(--border)';
                        return (
                          <button key={`n${item.id}`}
                            onClick={e => { e.stopPropagation(); router.push(`/note/${item.id}`); }}
                            title={`[${item.status}] ${item.menuName || item.title}`}
                            style={{
                              fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4,
                              background:sc.bg, color:sc.color,
                              borderLeft:`2px solid ${sb}`,
                              border:`1px solid transparent`, borderLeftWidth:2, borderLeftColor:sb,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              opacity: past ? 0.72 : 1,
                              cursor:'pointer', textAlign:'left', width:'100%',
                            }}>
                            {item.menuName || item.title}
                          </button>
                        );
                      }
                    })}
                    {overflow > 0 && (
                      <div style={{ fontSize:10, color:'var(--text-4)', fontWeight:600, paddingLeft:4 }}>
                        +{overflow}개
                      </div>
                    )}
                  </div>

                  {/* 작업 자동일지 도트 */}
                  {cLogs.length > 0 && (
                    <div style={{ display:'flex', gap:3, marginTop:3, flexWrap:'wrap' }}>
                      {[...new Set(cLogs.map(l => l.type))].slice(0, 4).map(type => {
                        const t = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
                        return (
                          <span key={type} title={t.label}
                            style={{ fontSize:9, background:'var(--surface-2)', borderRadius:3,
                              padding:'1px 4px', color:'var(--text-3)', fontWeight:600 }}>
                            {t.icon}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 선택 날짜 사이드 패널 ── */}
        {selectedDay && (
          <div className={`card ${panelClosing ? 'cal-panel-out' : 'cal-panel'}`}
            style={{ padding:'16px 18px', position:'sticky', top:80 }}>
            <DayPanel
              dateKey={selectedDay}
              today={today}
              notes={selectedNotes}
              schedules={selectedSchedules}
              workLogs={selectedWorkLogs}
              viewMode={viewMode}
              router={router}
              onClose={closePanel}
              onAddSchedule={() => setModal({ mode:'add', date:selectedDay })}
              onEditSchedule={s => setModal({ mode:'edit', schedule:s })}
              onAddNote={() => router.push(`/note/write?testDate=${selectedDay}`)}
            />
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:12,
        padding:'10px 16px', background:'var(--surface-2)', borderRadius:10, alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--text-3)' }}>범례</span>
        <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>── 노트</span>
        {STATUSES.map(s => (
          <span key={s} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-2)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:NOTE_DOT[s], flexShrink:0 }}/>
            {s}
          </span>
        ))}
        <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, marginLeft:8 }}>── 일정</span>
        {SCHEDULE_TYPES.map(t => {
          const c = SCHEDULE_COLORS[t];
          return (
            <span key={t} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-2)' }}>
              <span style={{ width:7, height:7, borderRadius:2, background:c.bg, border:`1.5px solid ${c.border}`, flexShrink:0 }}/>
              {t}
            </span>
          );
        })}
      </div>

      {/* 일정 모달 */}
      {modal && (
        <ScheduleModal
          initial={modal.schedule}
          defaultDate={modal.date}
          onSave={handleSaveSchedule}
          onClose={() => setModal(null)}
          onDelete={handleDeleteSchedule}
        />
      )}

      <ConfirmDialog
        open={confirmDel}
        title="일정 삭제"
        message={`"${modal?.schedule?.title}" 일정을 삭제할까요?`}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDeleteSchedule}
        onCancel={() => setConfirmDel(false)}
      />
    </main>
  );
}

