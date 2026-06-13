'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { downloadCsv, printCurrentPageWithDownloadDate } from '@/lib/download';
import { addSchedule, updateSchedule, deleteSchedule } from '@/lib/note/schedules';
import { ScheduleModal } from './_ScheduleModal';
import { DayPanel } from './_DayPanel';
import { CalendarSkeleton } from './_CalendarSkeleton';
import { pad } from '@/lib/format';
import { todayKey } from './_calendar-utils';
import { CalendarGrid } from './CalendarGrid';
import { CalendarLegend } from './CalendarLegend';
import { TodayChecklist } from './TodayChecklist';
import { useCalendarData } from './useCalendarData';
import { useCalendarMonth } from './useCalendarMonth';
import { useCalendarNavigation } from './useCalendarNavigation';
import { useTodayChecklist } from './useTodayChecklist';

/* ── 메인 페이지 ─────────────────────────────────────────── */
export default function Page() {
  const router = useRouter();

  const { notes, schedules, workLogs, samples, loading, load } = useCalendarData();
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
  const [confirmDel, setConfirmDel] = useState(false);

  const today = useMemo(() => todayKey(), []); // 마운트 시 1회 계산 (캐시 함수가 자정에도 갱신)
  const {
    todayChecklist,
    checkInput,
    setCheckInput,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
  } = useTodayChecklist({ today, notes, load });

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
    downloadCsv([headers, ...monthEventRows], `일정달력_${viewYear}년${pad(viewMonth)}월.csv`);
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
              onClick={() => printCurrentPageWithDownloadDate('일정 달력')}
            >
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
          <button className="btn sm ghost" style={{ fontSize: 11 }} onClick={resetToToday}>
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

      <TodayChecklist
        dateKey={today}
        items={todayChecklist}
        input={checkInput}
        onInput={setCheckInput}
        onAdd={addChecklistItem}
        onToggle={toggleChecklistItem}
        onRemove={removeChecklistItem}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <CalendarGrid
          cells={cells}
          workLogsByDate={workLogsByDate}
          samplesByDate={samplesByDate}
          viewMode={viewMode}
          selectedDay={selectedDay}
          today={today}
          animClass={animClass}
          calKey={calKey}
          onSelectDay={setSelectedDay}
          onClosePanel={closePanel}
          onAddSchedule={date => setModal({ mode: 'add', date })}
          onEditSchedule={schedule => setModal({ mode: 'edit', schedule })}
          onOpenNote={id => router.push(`/note/${id}`)}
          onOpenSample={id => router.push(`/note/sample/${id}`)}
        />

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

      <CalendarLegend />

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
