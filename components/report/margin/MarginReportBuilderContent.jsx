'use client';
import { useMemo, useState } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { ReportModeSwitch } from '@/components/report/ReportModeSwitch';
import { MarginReportOptions } from '@/components/report/margin/MarginReportOptions';
import { MarginReportPreview } from '@/components/report/margin/MarginReportPreview';
import { showToast } from '@/components/Toast';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { loadPlatforms } from '@/lib/cost/margin/platforms';
import {
  collectMarginReportCategories,
  collectMarginReportEdgeOptions,
  collectMarginReportSizeOptions,
  filterMarginReportRows,
} from '@/lib/cost/margin/report-options';
import { useReportPageState } from '@/hooks/useReportPageState';
import { buildMarginTableSections } from '@/app/cost/margin/marginTableSections';
import { useMarginData } from '@/app/cost/margin/useMarginData';

const DRAFT_KEY = 'report_draft_margin';

function updateSelection(setOpts, field, key, value) {
  setOpts(prev => ({
    ...prev,
    [field]: {
      ...(prev?.[field] || {}),
      [key]: value,
    },
  }));
}

function buildDiscount(enabled, type, value) {
  const num = parseFloat(value);
  if (!enabled || !Number.isFinite(num) || num <= 0) return null;
  if (type === 'pct') return { type, value: Math.max(0, Math.min(100, num)) };
  return { type: 'fixed', value: num };
}

export function MarginReportBuilderContent({ onReportModeChange }) {
  const { rows, platforms, loading, dbError, load } = useMarginData();
  const { opts, setOpts, updOpts, docFormat, updFmt } = useReportPageState(DRAFT_KEY, {
    categorySelection: {},
    edgeSelection: {},
    sizeSelection: {},
    includeHidden: false,
  });
  const [activePlatId, setActivePlatId] = useState('default');
  const [viewMode, setViewMode] = useState('cost');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState('pct');
  const [discountValue, setDiscountValue] = useState('');

  const safePlatforms = platforms?.length ? platforms : loadPlatforms();
  const activePlatform = useMemo(
    () =>
      safePlatforms.find(platform => platform.id === activePlatId) ||
      safePlatforms[0] || { id: 'default', name: '기본', fees: [] },
    [safePlatforms, activePlatId]
  );
  const discount = useMemo(
    () => buildDiscount(discountEnabled, discountType, discountValue),
    [discountEnabled, discountType, discountValue]
  );

  const categories = useMemo(() => collectMarginReportCategories(rows), [rows]);
  const edgeOptions = useMemo(() => collectMarginReportEdgeOptions(rows), [rows]);
  const sizeOptions = useMemo(() => collectMarginReportSizeOptions(rows), [rows]);

  const reportRows = useMemo(
    () =>
      filterMarginReportRows(rows, {
        categorySelection: opts.categorySelection,
        edgeSelection: opts.edgeSelection,
        sizeSelection: opts.sizeSelection,
        includeHidden: opts.includeHidden,
      }),
    [rows, opts.categorySelection, opts.edgeSelection, opts.sizeSelection, opts.includeHidden]
  );
  const reportSizeLabels = useMemo(() => collectMarginReportSizeOptions(reportRows), [reportRows]);
  const sections = useMemo(() => buildMarginTableSections(reportRows), [reportRows]);

  const handleExcelExport = () =>
    exportMarginExcel(reportRows, reportSizeLabels, viewMode, activePlatform, discount).catch(err =>
      showToast('엑셀 내보내기 실패: ' + (err?.message || '알 수 없는 오류'), 'error')
    );

  const reportMeta = {
    name: '원가마진표 보고서',
    period: '현재 원가 데이터',
    options: {
      reportMode: 'margin',
      viewMode,
      activePlatform: activePlatform?.name || '기본',
      discount,
      categorySelection: opts.categorySelection,
      edgeSelection: opts.edgeSelection,
      sizeSelection: opts.sizeSelection,
      includeHidden: opts.includeHidden,
    },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '원가 보고서', '원가마진표']}
      title="원가 보고서 생성"
      sub="원가계산과 원가마진표를 한 화면에서 전환해 PDF/Excel로 출력합니다."
      kind="cost"
      exportNote="원가마진표 엑셀 출력은 카테고리와 메뉴명만 유지하고, 중분류 컬럼은 제외됩니다."
      reportMeta={reportMeta}
      dataError={dbError}
      isLoading={loading}
      onRetry={load}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      options={
        <>
          <ReportModeSwitch value="margin" onChange={onReportModeChange} />
          <MarginReportOptions
            categories={categories}
            categorySelection={opts.categorySelection}
            onCategoryChange={(key, value) =>
              updateSelection(setOpts, 'categorySelection', key, value)
            }
            edgeOptions={edgeOptions}
            edgeSelection={opts.edgeSelection}
            onEdgeChange={(key, value) => updateSelection(setOpts, 'edgeSelection', key, value)}
            sizeOptions={sizeOptions}
            sizeSelection={opts.sizeSelection}
            onSizeChange={(key, value) => updateSelection(setOpts, 'sizeSelection', key, value)}
            platforms={safePlatforms}
            activePlatId={activePlatform.id}
            onActivePlatId={setActivePlatId}
            viewMode={viewMode}
            onViewMode={setViewMode}
            discountEnabled={discountEnabled}
            onDiscountEnabled={setDiscountEnabled}
            discountType={discountType}
            onDiscountType={setDiscountType}
            discountValue={discountValue}
            onDiscountValue={setDiscountValue}
            includeHidden={opts.includeHidden}
            onIncludeHidden={value => updOpts('includeHidden', value)}
            docFormat={docFormat}
            onFormatChange={updFmt}
          />
        </>
      }
      preview={
        <MarginReportPreview
          rows={reportRows}
          sections={sections}
          activePlatform={activePlatform}
          discount={discount}
          viewMode={viewMode}
          selectedCategoryCount={
            categories.filter(key => opts.categorySelection?.[key] !== false).length
          }
          selectedEdgeCount={
            edgeOptions.filter(option => opts.edgeSelection?.[option.key] !== false).length
          }
          selectedSizeCount={sizeOptions.filter(key => opts.sizeSelection?.[key] !== false).length}
        />
      }
    />
  );
}
