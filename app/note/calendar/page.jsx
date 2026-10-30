'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { addSchedule, updateSchedule, deleteSchedule } from '@/lib/note/schedules';
import { CalendarSkeleton } from './_CalendarSkeleton';
import { todayKey } from './_calendar-utils';
import { CalendarPageActions } from './CalendarPageActions';
import { CalendarPageDialogs } from './CalendarPageDialogs';
import { CalendarLegend } from './CalendarLegend';
import { CalendarToolbar } from './CalendarToolbar';
import { CalendarWorkspace } from './CalendarWorkspace';
import { TodayChecklist } from './TodayChecklist';
import { printCalendarMonth } from './calendar-print';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { useCalendarData } from './useCalendarData';
import { useCalendarMonth } from './useCalendarMonth';
import { useCalendarNavigation } from './useCalendarNavigation';
import { useTodayChecklist } from './useTodayChecklist';
import { getProfile } from '@/lib/profile';
import { calculateLeaveBalance } from '@/lib/note/annual-leave';
import { CalendarLeaveBalance } from './CalendarLeaveBalance';

/* ── 메인 페이지 ─────────────────────────────────────────── */
const INITIAL_TODAY_KEY = '2026-01-01';

export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;

  const { notes, schedules, workLogs, samples, loading, load } = useCalendarData({ canEdit });
  const {
    viewYear,
    viewMonth,
    selectedDay,
    setSelectedDay,
    panelClosing,
    monthDir,
    calKey,
    shiftMonth,
    resetToToday,
    closePanel,
  } = useCalendarNavigation();
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'notes' | 'schedules'
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', schedule?, date? }
  // 삭제 확인창이 열린 일정(없으면 null) — 확인창이 떠 있는 동안 modal이 먼저 닫혀도 대상이 사라지지 않게 따로 든다
  const [confirmDel, setConfirmDel] = useState(null);

  const [today, setToday] = useState(INITIAL_TODAY_KEY);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    setToday(todayKey());
    setProfile(getProfile());
    const refresh = () => {
      setToday(todayKey());
      setProfile(getProfile());
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(timer);
    };
  }, []);
  const leaveBalance = profile
    ? calculateLeaveBalance({
        hireDate: profile.hireDate,
        annualLeaveDays: profile.annualLeaveDays,
        schedules,
        today,
      })
    : null;
  const {
    todayChecklist,
    checkInput,
    setCheckInput,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
  } = useTodayChecklist({ today, load, canEdit });

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
  }, [closePanel, selectedDay, shiftMonth]);

  const {
    notesByDate,
    schedulesByDate,
    workLogsByDate,
    samplesByDate,
    monthStats,
    cells,
    selectedNotes,
    selectedSchedules,
    selectedWorkLogs,
    selectedSamples,
    monthEventRows,
  } = useCalendarMonth({
    notes,
    schedules,
    workLogs,
    samples,
    viewYear,
    viewMonth,
    viewMode,
    selectedDay,
    today,
  });

  /* 일정 저장 */
  async function handleSaveSchedule(data) {
    if (!canEdit) {
      showToast('일정 저장은 관리자만 가능합니다', 'warn');
      setModal(null);
      return;
    }
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
    if (!canEdit || !modal?.schedule?.id) return;
    setConfirmDel(modal.schedule);
  }

  async function confirmDeleteSchedule() {
    const target = confirmDel;
    setConfirmDel(null);
    if (!canEdit || !target?.id) {
      setModal(null);
      return;
    }
    try {
      await deleteSchedule(target.id);
      showToast('삭제됐습니다', 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
    setModal(null);
  }

  // 수정 화면에서 돌아올 때 보던 달·날짜로 복원하기 위해 함께 넘긴다
  const returnView =
    `&month=${viewYear}-${String(viewMonth).padStart(2, '0')}` +
    (selectedDay ? `&day=${selectedDay}` : '');

  function exportMonthPdf() {
    printCalendarMonth({
      viewYear,
      viewMonth,
      notesByDate,
      schedulesByDate,
      samplesByDate,
      workLogsByDate,
      viewMode,
    });
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
          <CalendarPageActions
            canExport={monthEventRows.length > 0}
            onExportMonth={exportMonthPdf}
            canEdit={canEdit}
            onAddSchedule={() => {
              if (canEdit) setModal({ mode: 'add', date: selectedDay || today });
            }}
            onAddNote={() => {
              if (canEdit) router.push('/note/write?from=calendar');
            }}
          />
        }
      />

      <CalendarToolbar
        viewYear={viewYear}
        viewMonth={viewMonth}
        monthStats={monthStats}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onShiftMonth={shiftMonth}
        onResetToToday={resetToToday}
      />

      <CalendarLeaveBalance balance={leaveBalance} />

      <TodayChecklist
        dateKey={today}
        items={todayChecklist}
        input={checkInput}
        canEdit={canEdit}
        onInput={setCheckInput}
        onAdd={addChecklistItem}
        onToggle={toggleChecklistItem}
        onRemove={removeChecklistItem}
      />

      <CalendarWorkspace
        cells={cells}
        workLogsByDate={workLogsByDate}
        samplesByDate={samplesByDate}
        viewMode={viewMode}
        selectedDay={selectedDay}
        today={today}
        animClass={animClass}
        calKey={calKey}
        panelClosing={panelClosing}
        selectedNotes={selectedNotes}
        selectedSchedules={selectedSchedules}
        selectedWorkLogs={selectedWorkLogs}
        selectedSamples={selectedSamples}
        canEdit={canEdit}
        onSelectDay={setSelectedDay}
        onClosePanel={closePanel}
        onAddSchedule={date => {
          if (canEdit) setModal({ mode: 'add', date });
        }}
        onEditSchedule={schedule => {
          if (canEdit) setModal({ mode: 'edit', schedule });
        }}
        onOpenNote={id => router.push(`/note/${id}?from=calendar${returnView}`)}
        onOpenSample={id => router.push(`/note/sample/${id}?from=calendar${returnView}`)}
        onAddNote={date => {
          if (canEdit) router.push(`/note/write?testDate=${date}&from=calendar${returnView}`);
        }}
      />

      <CalendarLegend />

      <CalendarPageDialogs
        modal={modal}
        confirmDeleteTarget={confirmDel}
        onSaveSchedule={handleSaveSchedule}
        onCloseSchedule={() => setModal(null)}
        onRequestDeleteSchedule={handleDeleteSchedule}
        onConfirmDeleteSchedule={confirmDeleteSchedule}
        onCancelDeleteSchedule={() => setConfirmDel(null)}
      />
    </main>
  );
}
