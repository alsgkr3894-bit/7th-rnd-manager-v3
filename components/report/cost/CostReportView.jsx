import { CostReportCategoryComparison } from './report-view/CostReportCategoryComparison';
import { CostReportCategorySections } from './report-view/CostReportCategorySections';
import { CostReportDiagnostics } from './report-view/CostReportDiagnostics';
import { CostReportRiskList } from './report-view/CostReportRiskList';
import { CostReportSummaryStats } from './report-view/CostReportSummaryStats';

/**
 * 원가계산 보고서 뷰 (viewTab === 'report').
 * 순수 렌더링 — 상태 없음, props만 사용.
 */
export function CostReportView({
  opts,
  catStats,
  totalCount,
  allAvg,
  allRisk,
  allMaxRate,
  riskThreshold,
  activeCats,
  riskMenus,
  diagnostics,
}) {
  return (
    <>
      {opts.summary && (
        <CostReportSummaryStats
          totalCount={totalCount}
          activeCategoryCount={activeCats.length}
          allAvg={allAvg}
          allRisk={allRisk}
          allMaxRate={allMaxRate}
          riskThreshold={riskThreshold}
        />
      )}

      {opts.catTable && (
        <CostReportCategoryComparison
          catStats={catStats}
          totalCount={totalCount}
          allAvg={allAvg}
          allRisk={allRisk}
          riskThreshold={riskThreshold}
        />
      )}

      {opts.perCategory && (
        <CostReportCategorySections catStats={catStats} riskThreshold={riskThreshold} />
      )}

      {opts.riskList && <CostReportRiskList riskMenus={riskMenus} riskThreshold={riskThreshold} />}

      <CostReportDiagnostics diagnostics={diagnostics} />
    </>
  );
}
