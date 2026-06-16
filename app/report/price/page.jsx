'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { PriceReportOptions } from '@/components/report/price/PriceReportOptions';
import { PriceReportPreview } from '@/components/report/price/PriceReportPreview';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { initDB } from '@/lib/db/init';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';
import { buildPriceReportData } from '@/lib/report/build-price-report';
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

  const [changes, setChanges] = useState([]);
  const [catSummary, setCatSummary] = useState([]);
  const [dateRange, setDateRange] = useState('—');
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const files = asObjectArray(await getPriceFiles());
          if (ignore) return;

          if (files.length < 2) {
            setDataError('비교할 가격 파일이 부족해요. 제때 가격 파일을 2개 이상 업로드해 주세요.');
            setIsLoading(false);
            return;
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
              setDataError('선택한 기간에 비교할 가격 파일이 없어요. 기간을 조정해 주세요.');
              setIsLoading(false);
              return;
            }
          } else {
            [latest, base] = sorted;
          }
          if (ignore) return;

          setDateRange(
            `${asDisplayText(base.updateDate, '—')} ~ ${asDisplayText(latest.updateDate, '—')}`
          );

          const [latestRows, baseRows] = await Promise.all([
            getPriceRowsByFileId(latest.id),
            getPriceRowsByFileId(base.id),
          ]);
          if (ignore) return;

          const { changes: filtered, catSummary: summary } = buildPriceReportData(
            baseRows,
            latestRows,
            0
          );
          setChanges(filtered);
          setCatSummary(summary);
          setDataError(null);
        } catch (err) {
          if (ignore) return;

          console.error('[price report]', err);
          setDataError('가격 파일을 비교하는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;

        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 가격 파일을 먼저 업로드해 주세요.');
      });

    return () => {
      ignore = true;
    };
  }, [periodMode, customFrom, customTo, todayStr, weekAgoStr]);

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
