'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { getAllNotes } from '@/lib/note';
import { getAllSamples, sampleNamesText } from '@/lib/sample';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note/constants';
import {
  getAllSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  SCHEDULE_TYPES,
  SCHEDULE_COLORS,
} from '@/lib/note/schedules';
import {
  getAllWorkLogs,
  WORK_LOG_TYPES,
  pruneOldWorkLogs,
  WORK_LOG_RETENTION_DAYS,
} from '@/lib/work-log';
import { ScheduleModal } from './_ScheduleModal';
import { DayPanel } from './_DayPanel';
import { CalendarSkeleton } from './_CalendarSkeleton';
import { expandOccurrences } from './_recurrence';
import { pad } from '@/lib/format';

/* ── 유틸 ─────────────────────────────────────────────────── */
const toKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** 달력 날짜 숫자 색상 — 오늘 > 일요일(빨강) > 토요일(파랑) > 지난날(흐림) > 평일 */
function dayNumColor({ hasToday, dow, past }) {
  if (hasToday) return '#fff';
  if (dow === 0) return '#EF4444';
  if (dow === 6) return '#3B82F6';
  return past ? 'var(--text-4)' : 'var(--text-1)';
}

/** items 배열을 날짜 키(YYYY-MM-DD) → item[] Map으로 그룹핑 */
function groupByDate(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// todayKey 캐싱 — 같은 날이면 재계산 없이 반환 (렌더당 70+ 호출 방지)
let _todayCache = '',
  _todayCacheNum = 0;
function todayKey() {
  const t = new Date();
  const n = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  if (n !== _todayCacheNum) {
    _todayCacheNum = n;
    _todayCache = toKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }
  return _todayCache;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}
function firstDow(y, m) {
  return new Date(y, m - 1, 1).getDay();
}
const isPast = (key, today) => key < today;
const isToday = (key, today) => key === today;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 노트 상태 도트 색 ─────────────────────────────────────── */
const NOTE_DOT = {
  아이디어: '#9CA3AF',
  테스트중: 'var(--accent)',
  재테스트: 'var(--warn)',
  보고예정: '#7C3AED',
  보류: '#9CA3AF',
  출시: 'var(--positive)',
  폐기: 'var(--negative)',
};

/* ── 메인 페이지 ─────────────────────────────────────────── */
export default function Page() {
  const router = useRouter();

  const [notes, setNotes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'notes' | 'schedules'
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', schedule?, date? }
  const [confirmDel, setConfirmDel] = useState(false);
  const [monthDir, setMonthDir] = useState(0); // -1 | 0 | 1 (animation direction)
  const calKey = useRef(0);
  const isAnimating = useRef(false); // 월 이동 중 연속 클릭 방지
  const animationTimerRef = useRef(null);
  const panelTimerRef = useRef(null);

  const today = useMemo(() => todayKey(), []); // 마운트 시 1회 계산 (캐시 함수가 자정에도 갱신)

  const load = useCallback(async () => {
    await initDB();
    await pruneOldWorkLogs(WORK_LOG_RETENTION_DAYS);
    const [ns, ss, wl, sm] = await Promise.all([
      getAllNotes(),
      getAllSchedules(),
      getAllWorkLogs(),
      getAllSamples(),
    ]);
    setNotes(ns);
    setSchedules(ss);
    setWorkLogs(wl);
    setSamples(sm);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(e => {
      console.error('[calendar] 로드 실패', e);
      setLoading(false);
    });
  }, [load]);

  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
    },
    []
  );

  /* 달 이동 — 애니메이션 중 연속 클릭 방지 */
  const shiftMonth = useCallback(delta => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    animationTimerRef.current = setTimeout(() => {
      isAnimating.current = false;
      animationTimerRef.current = null;
    }, 250);

    setMonthDir(delta);
    calKey.current += 1;
    setViewMonth(prev => {
      let m = prev + delta;
      if (m < 1) {
        setViewYear(y => y - 1);
        return 12;
      }
      if (m > 12) {
        setViewYear(y => y + 1);
        return 1;
      }
      return m;
    });
    setSelectedDay(null);
  }, []);

  /* 키보드: ← → 월 이동 / Escape 패널 닫기 */
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') shiftMonth(-1);
      if (e.key === 'ArrowRight') shiftMonth(1);
      if (e.key === 'Escape' && selectedDay) closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closePanel is intentionally read latest; including it (unmemoized) would re-subscribe the listener every render
  }, [selectedDay, shiftMonth]);

  /* 패널 닫기 — fade-out 후 상태 해제 */
  function closePanel() {
    if (panelClosing) return;
    setPanelClosing(true);
    if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
    panelTimerRef.current = setTimeout(() => {
      setSelectedDay(null);
      setPanelClosing(false);
      panelTimerRef.current = null;
    }, 180);
  }

  /* 날짜 맵 */
  const notesByDate = useMemo(() => groupByDate(notes, n => n.testDate?.slice(0, 10)), [notes]);
  const workLogsByDate = useMemo(
    () => groupByDate(workLogs, w => w.date?.slice(0, 10)),
    [workLogs]
  );
  const samplesByDate = useMemo(
    () => groupByDate(samples, s => s.testDate?.slice(0, 10)),
    [samples]
  );

  // 반복 일정 확장: 이달 그리드 범위에서 각 일정의 발생일을 계산해 날짜 맵으로 구성
  const schedulesByDate = useMemo(() => {
    const dim_ = daysInMonth(viewYear, viewMonth);
    const fd_ = firstDow(viewYear, viewMonth);
    const totalCells_ = Math.ceil((fd_ + dim_) / 7) * 7;
    // 그리드의 첫 날 / 마지막 날 (이전달·다음달 포함)
    const gridStartDt = new Date(viewYear, viewMonth - 1, 1 - fd_);
    const gridEndDt = new Date(viewYear, viewMonth - 1, totalCells_ - fd_);
    const gridStart = toKey(
      gridStartDt.getFullYear(),
      gridStartDt.getMonth() + 1,
      gridStartDt.getDate()
    );
    const gridEnd = toKey(gridEndDt.getFullYear(), gridEndDt.getMonth() + 1, gridEndDt.getDate());

    const map = new Map();
    for (const s of schedules) {
      if (!s.date) continue;
      const occurrences = expandOccurrences(s, gridStart, gridEnd);
      for (const dateStr of occurrences) {
        if (!map.has(dateStr)) map.set(dateStr, []);
        // 각 발생 항목에 원본 일정 id 와 반복 여부를 표시
        map.get(dateStr).push({
          ...s,
          _occurrenceDate: dateStr,
          _isRecurring: s.repeatType && s.repeatType !== 'none',
        });
      }
    }
    return map;
  }, [schedules, viewYear, viewMonth]);

  /* 이달 통계 — eventTotal은 기반(base) 일정 수로 계산 (발생 횟수 아님) */
  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    let noteDone = 0,
      noteScheduled = 0,
      eventTotal = 0;
    for (const [k, ns] of notesByDate) {
      if (!k.startsWith(prefix)) continue;
      isPast(k, today) ? (noteDone += ns.length) : (noteScheduled += ns.length);
    }
    // base 일정 중 이달에 date 가 있거나, 반복이 이달까지 걸치는 것을 count
    // 가장 단순하고 일관된 방법: schedules 원본에서 이달에 발생(date prefix)하는 것만 count
    const seen = new Set();
    for (const [k, ss] of schedulesByDate) {
      if (!k.startsWith(prefix)) continue;
      for (const s of ss) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          eventTotal++;
        }
      }
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
      if (dayNum < 1 || dayNum > dim) {
        arr.push(null);
        continue;
      }
      const key = toKey(viewYear, viewMonth, dayNum);
      const ns = notesByDate.get(key) || [];
      const ss = schedulesByDate.get(key) || [];
      arr.push({ dayNum, key, notes: ns, schedules: ss, dow: i % 7 });
    }
    return arr;
  }, [viewYear, viewMonth, totalCells, fd, dim, notesByDate, schedulesByDate]);

  /* 선택 날짜 항목 */
  const selectedNotes = useMemo(
    () => (selectedDay ? notesByDate.get(selectedDay) || [] : []),
    [selectedDay, notesByDate]
  );
  const selectedSchedules = useMemo(
    () => (selectedDay ? schedulesByDate.get(selectedDay) || [] : []),
    [selectedDay, schedulesByDate]
  );
  const selectedWorkLogs = useMemo(
    () => (selectedDay ? workLogsByDate.get(selectedDay) || [] : []),
    [selectedDay, workLogsByDate]
  );
  const selectedSamples = useMemo(
    () => (selectedDay ? samplesByDate.get(selectedDay) || [] : []),
    [selectedDay, samplesByDate]
  );

  const monthEventRows = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    const rows = [];
    const includeSchedules = viewMode === 'all' || viewMode === 'schedules';
    const includeNotes = viewMode === 'all' || viewMode === 'notes';
    const includeSamples = viewMode === 'all' || viewMode === 'samples';

    if (includeSchedules) {
      for (const [date, items] of schedulesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            item.time || '',
            '일정',
            item.title || '',
            item.type || '',
            item.memo || item.description || (item._isRecurring ? '반복 일정' : ''),
          ]);
        }
      }
    }

    if (includeNotes) {
      for (const [date, items] of notesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            '',
            '노트',
            item.menuName || item.title || '',
            item.status || '',
            item.result || item.summary || '',
          ]);
        }
      }
    }

    if (includeSamples) {
      for (const [date, items] of samplesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            '',
            '샘플',
            sampleNamesText(item) || item.title || '',
            item.company || item.category || '',
            item.result || item.description || '',
          ]);
        }
      }
    }

    if (viewMode === 'all') {
      for (const [date, items] of workLogsByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          const meta = WORK_LOG_TYPES[item.type] || WORK_LOG_TYPES.OTHER;
          rows.push([
            date,
            item.time ||
              (item.at
                ? new Date(item.at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''),
            '작업일지',
            meta.label || item.type || '',
            item.type || '',
            item.summary || item.title || item.detail || '',
          ]);
        }
      }
    }

    return rows.sort(
      (a, b) =>
        String(a[0]).localeCompare(String(b[0])) ||
        String(a[1]).localeCompare(String(b[1])) ||
        String(a[2]).localeCompare(String(b[2]), 'ko')
    );
  }, [notesByDate, samplesByDate, schedulesByDate, viewMode, viewMonth, viewYear, workLogsByDate]);

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
      showToast('저장 실패: ' + e.message, 'error');
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
      showToast('삭제 실패: ' + e.message, 'error');
    }
    setModal(null);
  }

  function exportMonthCsv() {
    const headers = ['날짜', '시간', '구분', '제목', '상태/분류', '내용'];
    downloadCsv([headers, ...monthEventRows], `일정달력_${viewYear}-${pad(viewMonth)}.csv`);
  }

  async function copyMonthSummary() {
    const lines = [`${viewYear}년 ${viewMonth}월 일정 요약 (${monthEventRows.length}건)`];
    const byDate = new Map();
    for (const row of monthEventRows) {
      const d = row[0];
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(`  [${row[2]}] ${row[3]}${row[4] ? ` (${row[4]})` : ''}`);
    }
    for (const [date, items] of [...byDate.entries()].sort()) {
      lines.push(date, ...items);
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('월간 일정 요약을 복사했어요', 'ok');
    } catch {
      showToast('복사에 실패했어요', 'error');
    }
  }

  if (loading)
    return (
      <main className="main">
        <PageHeader breadcrumb={['메뉴개발노트', '일정 달력']} title="일정 달력" />
        <CalendarSkeleton />
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
          <div className="calendar-actions">
            <button
              className="btn no-print"
              onClick={exportMonthCsv}
              disabled={monthEventRows.length === 0}
            >
              <Icon.download style={{ width: 14, height: 14 }} /> CSV
            </button>
            <button
              className="btn no-print"
              onClick={copyMonthSummary}
              disabled={monthEventRows.length === 0}
              title="월간 일정 요약 복사"
            >
              <Icon.copy style={{ width: 14, height: 14 }} /> 보고용 복사
            </button>
            <button className="btn no-print" onClick={() => window.print()}>
              인쇄
            </button>
            <button
              className="btn no-print"
              onClick={() => setModal({ mode: 'add', date: selectedDay || today })}
            >
              <Icon.plus style={{ width: 14, height: 14 }} /> 일정 추가
            </button>
            <button className="btn primary no-print" onClick={() => router.push('/note/write')}>
              <Icon.plus style={{ width: 14, height: 14 }} /> 새 노트
            </button>
          </div>
        }
      />

      {/* 컨트롤 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        {/* 월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn sm" onClick={() => shiftMonth(-1)}>
            <Icon.chevLeft style={{ width: 14, height: 14 }} />
          </button>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              minWidth: 108,
              textAlign: 'center',
            }}
          >
            {viewYear}년 {viewMonth}월
          </span>
          <button className="btn sm" onClick={() => shiftMonth(1)}>
            <Icon.chevRight style={{ width: 14, height: 14 }} />
          </button>
          <button
            className="btn sm ghost"
            style={{ fontSize: 11 }}
            onClick={() => {
              setViewYear(new Date().getFullYear());
              setViewMonth(new Date().getMonth() + 1);
              setSelectedDay(null);
            }}
          >
            오늘
          </button>
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {monthStats.noteDone > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
              테스트 <b style={{ color: 'var(--text-1)' }}>{monthStats.noteDone}</b>건
            </span>
          )}
          {monthStats.noteScheduled > 0 && (
            <span style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
              예정 <b>{monthStats.noteScheduled}</b>건
            </span>
          )}
          {monthStats.eventTotal > 0 && (
            <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>
              일정 <b>{monthStats.eventTotal}</b>건
            </span>
          )}
        </div>

        {/* 뷰 모드 */}
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {[
            ['all', '전체'],
            ['notes', '노트'],
            ['schedules', '일정'],
            ['samples', '샘플'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setViewMode(k)}
              style={{
                padding: '5px 13px',
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === k ? 'var(--accent)' : 'var(--surface-2)',
                color: viewMode === k ? '#fff' : 'var(--text-3)',
                transition: 'background 0.12s',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {/* ── 달력 그리드 ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 요일 헤더 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7,1fr)',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text-3)',
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div
            key={calKey.current}
            className={animClass}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
          >
            {cells.map((cell, idx) => {
              if (!cell)
                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: 90,
                      background: 'var(--surface-2)',
                      borderRight: '1px solid var(--divider)',
                      borderBottom: '1px solid var(--divider)',
                    }}
                  />
                );
              const { dayNum, key, notes: cNotes, schedules: cSched, dow } = cell;
              const cLogs = workLogsByDate.get(key) || [];
              const cSamples = samplesByDate.get(key) || [];
              const showNotes = viewMode === 'all' || viewMode === 'notes';
              const showSched = viewMode === 'all' || viewMode === 'schedules';
              const showSamples = viewMode === 'all' || viewMode === 'samples';
              const visNotes = showNotes ? cNotes : [];
              const visSched = showSched ? cSched : [];
              const visSamples = showSamples ? cSamples : [];
              const isSelected = selectedDay === key;
              const hasToday = isToday(key, today);
              const past = isPast(key, today);
              const total = visNotes.length + visSched.length + visSamples.length;
              const MAX = 3;
              // _kind 명시로 일정/노트/샘플 구분을 안전하게
              const shown = [
                ...visSched.map(s => ({ ...s, _kind: 'schedule' })),
                ...visNotes.map(n => ({ ...n, _kind: 'note' })),
                ...visSamples.map(s => ({ ...s, _kind: 'sample' })),
              ].slice(0, MAX);
              const overflow = total - MAX;

              return (
                <div
                  key={key}
                  onClick={() => (isSelected ? closePanel() : setSelectedDay(key))}
                  style={{
                    minHeight: 90,
                    padding: '5px 6px',
                    borderRight: '1px solid var(--divider)',
                    borderBottom: '1px solid var(--divider)',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'var(--accent-soft)'
                      : hasToday
                        ? 'color-mix(in oklab, var(--accent-soft) 35%, var(--surface))'
                        : 'var(--surface)',
                    transition: 'background 0.12s',
                    position: 'relative',
                  }}
                >
                  {/* 날짜 숫자 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: hasToday ? 800 : 600,
                        background: hasToday ? 'var(--accent)' : 'transparent',
                        color: dayNumColor({ hasToday, dow, past }),
                      }}
                    >
                      {dayNum}
                    </span>
                    {/* 일정 추가 버튼 */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedDay(key);
                        setModal({ mode: 'add', date: key });
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-4)',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                      }}
                      className="cal-add-btn"
                      title="일정 추가"
                    >
                      +
                    </button>
                  </div>

                  {/* 항목 칩 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {shown.map(item => {
                      if (item._kind === 'schedule') {
                        const c = SCHEDULE_COLORS[item.type] || SCHEDULE_COLORS['기타'];
                        return (
                          <button
                            key={`s${item.id}_${item._occurrenceDate || item.date}`}
                            onClick={e => {
                              e.stopPropagation();
                              setModal({ mode: 'edit', schedule: item });
                            }}
                            title={`[${item.type}] ${item.title}${item.time ? ' ' + item.time : ''}${item._isRecurring ? ' (반복)' : ''}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: 4,
                              background: c.bg,
                              color: c.text,
                              borderLeft: `2px solid ${c.border}`,
                              border: `1px solid transparent`,
                              borderLeftWidth: 2,
                              borderLeftColor: c.border,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            {item._isRecurring && (
                              <span style={{ opacity: 0.7, marginRight: 2 }}>↻</span>
                            )}
                            {item.time ? `${item.time} ` : ''}
                            {item.title}
                          </button>
                        );
                      } else if (item._kind === 'sample') {
                        const label = sampleNamesText(item) || item.title;
                        return (
                          <button
                            key={`sm${item.id}`}
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/note/sample/${item.id}`);
                            }}
                            title={`[샘플] ${label}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: 4,
                              background: 'var(--positive-soft)',
                              color: 'var(--positive)',
                              border: '1px solid transparent',
                              borderLeftWidth: 2,
                              borderLeftColor: 'var(--positive)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            {label}
                          </button>
                        );
                      } else {
                        const sc = STATUS_COLORS[item.status] || STATUS_COLORS['아이디어'];
                        const sb = STATUS_BORDER[item.status] || 'var(--border)';
                        return (
                          <button
                            key={`n${item.id}`}
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/note/${item.id}`);
                            }}
                            title={`[${item.status}] ${item.menuName || item.title}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: 4,
                              background: sc.bg,
                              color: sc.color,
                              borderLeft: `2px solid ${sb}`,
                              border: `1px solid transparent`,
                              borderLeftWidth: 2,
                              borderLeftColor: sb,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              opacity: past ? 0.72 : 1,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            {item.menuName || item.title}
                          </button>
                        );
                      }
                    })}
                    {overflow > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDay(key);
                        }}
                        style={{
                          fontSize: 10,
                          color: 'var(--accent-text)',
                          fontWeight: 600,
                          paddingLeft: 4,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        +{overflow}개 더보기
                      </button>
                    )}
                  </div>

                  {/* 작업 자동일지 도트 */}
                  {cLogs.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                      {[...new Set(cLogs.map(l => l.type))].slice(0, 4).map(type => {
                        const t = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
                        return (
                          <span
                            key={type}
                            title={t.label}
                            style={{
                              fontSize: 9,
                              background: 'var(--surface-2)',
                              borderRadius: 3,
                              padding: '1px 4px',
                              color: 'var(--text-3)',
                              fontWeight: 600,
                            }}
                          >
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
          <div
            className={`card ${panelClosing ? 'cal-panel-out' : 'cal-panel'}`}
            style={{ padding: '16px 18px', position: 'sticky', top: 80 }}
          >
            <DayPanel
              dateKey={selectedDay}
              today={today}
              notes={selectedNotes}
              schedules={selectedSchedules}
              workLogs={selectedWorkLogs}
              samples={selectedSamples}
              viewMode={viewMode}
              router={router}
              onClose={closePanel}
              onAddSchedule={() => setModal({ mode: 'add', date: selectedDay })}
              onEditSchedule={s => setModal({ mode: 'edit', schedule: s })}
              onAddNote={() => router.push(`/note/write?testDate=${selectedDay}`)}
            />
          </div>
        )}
      </div>

      {/* 범례 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          marginTop: 12,
          padding: '10px 16px',
          background: 'var(--surface-2)',
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>범례</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>── 노트</span>
        {STATUSES.map(s => (
          <span
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--text-2)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: NOTE_DOT[s],
                flexShrink: 0,
              }}
            />
            {s}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 8 }}>
          ── 일정
        </span>
        {SCHEDULE_TYPES.map(t => {
          const c = SCHEDULE_COLORS[t];
          return (
            <span
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--text-2)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: c.bg,
                  border: `1.5px solid ${c.border}`,
                  flexShrink: 0,
                }}
              />
              {t}
            </span>
          );
        })}
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 8 }}>
          ── 샘플
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-2)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: 'var(--positive-soft)',
              border: '1.5px solid var(--positive)',
              flexShrink: 0,
            }}
          />
          샘플 수령
        </span>
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
