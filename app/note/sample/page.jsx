'use client';
import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SampleCalendarView } from './_SampleCalendarView';
import { SampleCompareBar } from './_SampleCompareBar';
import { SampleFilterControls } from './_SampleFilterControls';
import { SamplePageActions } from './_SamplePageActions';
import { SamplePageDialogs } from './_SamplePageDialogs';
import { SampleRecordsView } from './_SampleRecordsView';
import { useSamplePageController } from './useSamplePageController';

/* ── 메인 페이지 ── */
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <SampleContent />
    </Suspense>
  );
}

function SampleContent() {
  const {
    loadErrorProps,
    headerProps,
    actionsProps,
    filterProps,
    calendarVisible,
    calendarProps,
    recordsProps,
    compareBarProps,
    dialogsProps,
  } = useSamplePageController();

  if (loadErrorProps.loadError) {
    return (
      <main className="main">
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)', marginTop: 32 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {loadErrorProps.loadError.message || String(loadErrorProps.loadError)}
          </div>
          <button className="btn primary" onClick={loadErrorProps.onRetry}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={headerProps.breadcrumb}
        title={headerProps.title}
        sub={headerProps.sub}
        actions={<SamplePageActions {...actionsProps} />}
      />

      <SampleFilterControls {...filterProps} />

      {calendarVisible && <SampleCalendarView {...calendarProps} />}

      <SampleRecordsView {...recordsProps} />

      <SampleCompareBar {...compareBarProps} />

      <SamplePageDialogs {...dialogsProps} />
    </main>
  );
}
