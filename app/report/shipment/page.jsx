'use client';
import { useState } from 'react';
import ReportBuilderShell from '@/components/report/ReportBuilderShell';
import { useReportPageState } from '@/hooks/useReportPageState';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { safeMonth, safeQuantity, safeYear } from '@/lib/report/period';
import { useShipmentReportData } from '@/hooks/useShipmentReportData';
import { ShipmentReportOptions } from '@/components/report/shipment/ShipmentReportOptions';
import { ShipmentReportPreview } from '@/components/report/shipment/ShipmentReportPreview';
import { safeProductName } from '@/components/report/shipment/ShipmentItemTable';

const DRAFT_KEY = 'report_draft_shipment';

export default function Page() {
  const periodMode = 'month';
  const [shipYear, setShipYear] = useState(new Date().getFullYear());
  const [shipMonth, setShipMonth] = useState(new Date().getMonth() + 1);
  const {
    opts,
    updOpts: upd,
    docFormat,
    updFmt,
  } = useReportPageState(
    DRAFT_KEY,
    {
      scope: 'all',
      chart: true,
      catSummary: true,
      amountSummary: true,
      fullList: true,
      notShippedList: true,
    },
    draft => {
      if (draft.shipYear) setShipYear(safeYear(draft.shipYear));
      if (draft.shipMonth) setShipMonth(safeMonth(draft.shipMonth));
    }
  );

  const {
    aggRows,
    regProducts,
    series,
    seriesLabels,
    fileLabel,
    availPeriods,
    dataError,
    isLoading,
    reload,
  } = useShipmentReportData(shipYear, shipMonth, setShipYear, setShipMonth);

  const safeAggRows = asObjectArray(aggRows);
  const safeRegProducts = asObjectArray(regProducts);
  const safeSeries = asObjectArray(series);
  const safeSeriesLabels = Array.isArray(seriesLabels)
    ? seriesLabels.map(label => asDisplayText(label)).filter(Boolean)
    : [];
  const safeAvailPeriods = asObjectArray(availPeriods)
    .map(p => ({ year: safeYear(p.year, 0), month: safeMonth(p.month, 0) }))
    .filter(p => p.year && p.month);
  const safeShipYear = safeYear(shipYear);
  const safeShipMonth = safeMonth(shipMonth);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};

  const byQtyDesc = (a, b) => safeQuantity(b.totalQuantity) - safeQuantity(a.totalQuantity);
  const sumQty = list => asObjectArray(list).reduce((s, r) => s + safeQuantity(r.totalQuantity), 0);
  const sumAmt = list => asObjectArray(list).reduce((s, r) => s + safeQuantity(r.totalAmount), 0);

  const exclusive = [...safeAggRows].filter(r => r.productType === 'exclusive').sort(byQtyDesc);
  const genericAll = [...safeAggRows].filter(r => r.productType !== 'exclusive').sort(byQtyDesc);
  const managed = genericAll.filter(r => r.isManaged);

  const totalQty = sumQty(safeAggRows);
  const exclusiveQty = sumQty(exclusive);
  const genericQty = sumQty(genericAll);
  const managedQty = sumQty(managed);

  const regGeneric = safeRegProducts.filter(p => p.productType !== 'exclusive');
  const regGenericCount = regGeneric.length;
  const regManagedCount = regGeneric.filter(p => p.isManaged).length;
  const shippedGenericCount = genericAll.length;

  const totalAmt = sumAmt(safeAggRows);
  const exclusiveAmt = sumAmt(exclusive);
  const genericAmt = sumAmt(genericAll);
  const managedAmt = sumAmt(managed);

  const scope = ['all', 'exclusive', 'generic'].includes(safeOpts.scope) ? safeOpts.scope : 'all';
  const showExclusive = scope !== 'generic';
  const showGeneric = scope !== 'exclusive';

  const qtyStats =
    scope === 'exclusive'
      ? [
          ['전용상품 출고량', exclusiveQty],
          ['전용상품 수', exclusive.length, true],
        ]
      : scope === 'generic'
        ? [
            [`범용상품 ${safeShipMonth}월 출고량`, genericQty],
            ['범용상품 총 상품수', regGenericCount, true],
            [`${safeShipMonth}월 출고 제품수`, shippedGenericCount, true],
            ['관리품목수', regManagedCount, true],
          ]
        : [
            ['총 출고량', totalQty],
            ['전용상품', exclusiveQty],
            ['범용상품', genericQty],
            ['관리품목', managedQty],
          ];

  const amtStats =
    scope === 'exclusive'
      ? [['전용상품 출고금액', exclusiveAmt]]
      : scope === 'generic'
        ? [['범용상품 출고금액', genericAmt]]
        : [
            ['총 출고금액', totalAmt],
            ['전용상품 출고금액', exclusiveAmt],
            ['범용상품 출고금액', genericAmt],
            ['관리품목 출고금액', managedAmt],
          ];

  const shippedCodes = new Set();
  const shippedNorms = new Set();
  for (const r of safeAggRows) {
    const productCode = asDisplayText(r.productCode);
    const normalizedProductName = asDisplayText(r.normalizedProductName);
    if (productCode) shippedCodes.add(productCode);
    if (normalizedProductName) shippedNorms.add(normalizedProductName);
  }
  const isShipped = p =>
    (asDisplayText(p.productCode) && shippedCodes.has(asDisplayText(p.productCode))) ||
    (asDisplayText(p.normalizedProductName) &&
      shippedNorms.has(asDisplayText(p.normalizedProductName)));
  const notShipped = safeRegProducts
    .filter(p =>
      scope === 'exclusive'
        ? p.productType === 'exclusive'
        : scope === 'generic'
          ? p.productType !== 'exclusive'
          : true
    )
    .filter(p => !isShipped(p))
    .sort((a, b) => safeProductName(a).localeCompare(safeProductName(b), 'ko'));

  const SERIES_COLOR = { 전용상품: '#1D766F', 범용상품: '#7C3AED' };
  const chartSeries = safeSeries.filter(
    s => (s.name === '전용상품' && showExclusive) || (s.name === '범용상품' && showGeneric)
  );
  const chartColors = chartSeries.map(s => SERIES_COLOR[s.name]);

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
  const reportMeta = {
    kind: 'shipment',
    period: fileLabel,
    name: `${fileLabel} 제때 출고량 보고서`,
    options: { periodMode, shipYear: safeShipYear, shipMonth: safeShipMonth, opts: safeOpts },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '제때 출고량 보고서']}
      title="제때 출고량 보고서 생성"
      sub="전용상품·범용(관리)품목 출고량을 분류별로 요약해요."
      kind="shipment"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      onRetry={reload}
      docFormat={docFormat}
      options={
        <ShipmentReportOptions
          safeAvailPeriods={safeAvailPeriods}
          safeShipYear={safeShipYear}
          safeShipMonth={safeShipMonth}
          scope={scope}
          setShipYear={setShipYear}
          setShipMonth={setShipMonth}
          upd={upd}
          updFmt={updFmt}
          docFormat={docFormat}
          safeOpts={safeOpts}
        />
      }
      preview={
        <ShipmentReportPreview
          fileLabel={fileLabel}
          showExclusive={showExclusive}
          showGeneric={showGeneric}
          exclusive={exclusive}
          genericAll={genericAll}
          managed={managed}
          exclusiveQty={exclusiveQty}
          genericQty={genericQty}
          managedQty={managedQty}
          safeOpts={safeOpts}
          qtyStats={qtyStats}
          amtStats={amtStats}
          chartSeries={chartSeries}
          chartColors={chartColors}
          safeSeriesLabels={safeSeriesLabels}
          notShipped={notShipped}
          safeShipMonth={safeShipMonth}
          todayLabel={todayLabel}
          isLoading={isLoading}
          aggRowsLength={safeAggRows.length}
        />
      }
    />
  );
}
