'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { printCurrentPageWithDownloadDate } from '@/lib/download';
import { openPrintWindow, buildAutoPrintScript } from '@/lib/print/window-print';
import { withDownloadDateSuffix } from '@/lib/download';
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

  function exportMonthPdf() {
    const title = withDownloadDateSuffix(`${viewYear}년 ${viewMonth}월 달력`);
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    const dateSet = new Set([
      ...Array.from((notesByDate || new Map()).keys()),
      ...Array.from((schedulesByDate || new Map()).keys()),
    ]);
    const dates = [...dateSet].filter(d => d.startsWith(prefix)).sort();
    function esc(v) {
      return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    const body = dates.map(date => {
      const [, , d] = date.split('-');
      const scheds = schedulesByDate.get(date) || [];
      const noteItems = notesByDate.get(date) || [];
      const rows = [
        ...scheds.map(s => `<tr><td class="type sched">일정</td><td>${esc(s.time || '—')}</td><td>${esc(s.title)}</td><td>${esc(s.type || '')}</td><td>${esc(s.memo || s.description || '')}</td></tr>`),
        ...noteItems.map(n => `<tr><td class="type note">노트</td><td>—</td><td>${esc(n.menuName || n.title || '')}</td><td>${esc(n.status || '')}</td><td>${esc(n.result || n.summary || '')}</td></tr>`),
      ].join('');
      if (!rows) return '';
      return `<section class="day"><div class="day-head">${viewMonth}/${d}</div><table><thead><tr><th style="width:48px">구분</th><th style="width:50px">시간</th><th>제목</th><th style="width:72px">상태</th><th>내용</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    }).filter(Boolean).join('');
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
*{box-sizing:border-box;}body{margin:0;padding:14mm 16mm;font-family:Pretendard,-apple-system,sans-serif;font-size:10pt;color:#111;background:#fff;}
@page{size:A4 portrait;margin:14mm 16mm;}
h1{font-size:18pt;font-weight:900;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;}
.day{margin-bottom:14px;break-inside:avoid;}
.day-head{font-size:12pt;font-weight:800;margin-bottom:4px;color:#111;}
table{width:100%;border-collapse:collapse;font-size:9pt;}
th,td{border:1px solid #ddd;padding:4px 6px;vertical-align:top;}
th{background:#f5f5f5;font-weight:800;text-align:center;}
.type{font-weight:700;text-align:center;white-space:nowrap;}
.type.sched{color:#0369A1;}.type.note{color:#7C3AED;}
</style></head><body><h1>${esc(title)}</h1>${body || '<p style="color:#999">이번 달 항목이 없습니다</p>'}${buildAutoPrintScript()}</body></html>`;
    openPrintWindow(html, { width: 900, height: 700 });
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
              onClick={exportMonthPdf}
              disabled={monthEventRows.length === 0}
            >
              <Icon.doc style={{ width: 14, height: 14 }} /> PDF
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
            <span style={{ fontSize: 12, color: 'var(--color-reporting)', fontWeight: 600 }}>
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
                color: viewMode === k ? 'var(--surface)' : 'var(--text-3)',
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
