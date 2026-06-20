'use client';
import { useState } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { PriceReportOptions } from '@/components/report/price/PriceReportOptions';
import { PriceReportPreview } from '@/components/report/price/PriceReportPreview';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';
import { buildPriceReportData } from '@/lib/report/build-price-report';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { todayLocalDate, localDateBefore } from '@/lib/date/local-date';

const DRAFT_KEY = 'report_draft_price';

function safeDateInput(value, fallback) {
  const text = asDisplayText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

export default function Page() {
  const [periodMode, setPeriodMode] = useState('week');
  const [opts, setOpts] = useState({
    catSummary: true,
    costImpact: true,
  });
  const upd = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  const todayStr = todayLocalDate();
  const weekAgoStr = localDateBefore(7);
  const [customFrom, setCustomFrom] = useState(weekAgoStr);
  const [customTo, setCustomTo] = useState(todayStr);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  // 파일 선택 로직이 periodMode·날짜에 따라 다른 파일 ID를 조회하므로 deps 사용.
  // keepDataOnReload:false — 기간 변경 시 이전 기간 데이터가 잠시라도 표시되지 않도록.
  const {
    data,
    loading: isLoading,
    errorMessage: dataError,
    reload,
  } = useDBLoad(
    async () => {
      const files = asObjectArray(await getPriceFiles());
      if (files.length < 2) {
        throw new Error('비교할 가격 파일이 부족해요. 제때 가격 파일을 2개 이상 업로드해 주세요.');
      }
      const sorted = [...files].sort((a, b) =>
        asDisplayText(a.updateDate) > asDisplayText(b.updateDate) ? -1 : 1
      );

      let base, latest;
      if (periodMode === 'custom') {
        const safeCustomTo = safeDateInput(customTo, todayStr);
        const safeCustomFrom = safeDateInput(customFrom, weekAgoStr);
        const toFiles = sorted.filter(f => asDisplayText(f.updateDate) <= safeCustomTo);
        const fromFiles = sorted.filter(f => asDisplayText(f.updateDate) <= safeCustomFrom);
        latest = toFiles[0];
        base = fromFiles.find(f => f.id !== latest?.id) || sorted[1];
        if (!latest || !base || latest.id === base.id) {
          throw new Error('선택한 기간에 비교할 가격 파일이 없어요. 기간을 조정해 주세요.');
        }
      } else {
        [latest, base] = sorted;
      }

      const dateRange = `${asDisplayText(base.updateDate, '—')} ~ ${asDisplayText(latest.updateDate, '—')}`;
      const [latestRows, baseRows] = await Promise.all([
        getPriceRowsByFileId(latest.id),
        getPriceRowsByFileId(base.id),
      ]);
      const { changes, catSummary } = buildPriceReportData(baseRows, latestRows, 0);
      return { changes, catSummary, dateRange };
    },
    {
      deps: [periodMode, customFrom, customTo, todayStr, weekAgoStr],
      keepDataOnReload: false,
      mapErrorMessage: err => err.message,
    }
  );

  const changes = data?.changes ?? [];
  const catSummary = data?.catSummary ?? [];
  const dateRange = data?.dateRange ?? '—';

  const reportMeta = {
    kind: 'price',
    period: dateRange,
    name: `제때 가격 변동 보고서 (${dateRange})`,
    options: { periodMode, opts },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '제때 가격 보고서']}
      title="제때 가격 보고서 생성"
      sub="제때 단가 변동 — 변동된 품목을 전체 자동 추출해요."
      kind="price"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={reload}
      docFormat={docFormat}
      options={
        <PriceReportOptions
          periodMode={periodMode}
          onPeriodMode={setPeriodMode}
          customFrom={customFrom}
          onCustomFrom={setCustomFrom}
          customTo={customTo}
          onCustomTo={setCustomTo}
          todayStr={todayStr}
          weekAgoStr={weekAgoStr}
          opts={opts}
          onOptionChange={upd}
          docFormat={docFormat}
          onFormatChange={updFmt}
        />
      }
      preview={
        <PriceReportPreview
          dateRange={dateRange}
          changes={changes}
          catSummary={catSummary}
          opts={opts}
        />
      }
    />
  );
}
