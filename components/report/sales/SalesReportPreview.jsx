'use client';
import SalesKpiCards from '@/components/report/SalesKpiCards';
import { periodCompareLabel } from '@/lib/report/period';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { SalesCategoryShareSection } from './SalesCategoryShareSection';
import { SalesCompareTableSection } from './SalesCompareTableSection';
import { SalesExcludedListSection } from './SalesExcludedListSection';
import { SalesPizzaMoverSection } from './SalesPizzaMoverSection';
import { SalesRankTableSection } from './SalesRankTableSection';
import { SalesDiscontinuedBulkFix } from './SalesDiscontinuedBulkFix';

function scopeLabel(scope) {
  return scope === 'all' ? '전체 메뉴' : asDisplayText(scope, '전체 메뉴');
}

export default function SalesReportPreview({
  periodLabel,
  scope,
  viewMode,
  periodMode,
  cmpPeriodLabel,
  todayLabel,
  profileName,
  opts,
  kpi,
  catShares,
  groupRanking,
  totalShare,
  compareData,
  excludedList,
  canEdit = false,
  onMarkIrregular,
  onUnmarkIrregular,
  onUndiscontinue,
  onUndiscontinueAll,
}) {
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  // 비정규메뉴(irregular)는 별도의 배지·해제 흐름이 있으므로 여기 집계에서는 제외 —
  // "메뉴마스터 status=discontinued"로 표시된 항목만 일괄 해제 대상이다.
  const discontinuedRegisteredCount = safeGroupRanking.filter(
    item => item.discontinued && !item.irregular
  ).length;
  const safeExcludedList = Array.isArray(excludedList) ? excludedList : [];
  const compareLabel = periodCompareLabel(periodMode);
  const unitLabel = periodMode === 'quarter' ? '분기' : periodMode === 'year' ? '년도' : '월';

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
        <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
        <div className="paper-meta">
          <span>대상: {scopeLabel(scope)}</span>
          <span>·</span>
          <span>
            {viewMode === 'compare' ? `비교: ${cmpPeriodLabel}` : `해당 ${unitLabel} 순위`}
          </span>
          <span>·</span>
          <span className="mono">
            생성일 {todayLabel} · {asDisplayText(profileName, '')}
          </span>
        </div>
      </div>

      {safeOpts.summary && (
        <SalesKpiCards
          kpi={kpi}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          showRevenue={!!safeOpts.revenue}
          compareLabel={compareLabel}
        />
      )}

      {safeOpts.catShare && (
        <SalesCategoryShareSection
          catShares={safeCatShares}
          totalShare={totalShare}
          showRevenue={!!safeOpts.revenue}
        />
      )}

      {safeOpts.pizzaMover && viewMode === 'rank' && (
        <SalesPizzaMoverSection
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          periodMode={periodMode}
        />
      )}

      {safeOpts.rankTable && viewMode === 'rank' && (
        <SalesDiscontinuedBulkFix
          count={discontinuedRegisteredCount}
          canEdit={canEdit}
          onUndiscontinueAll={onUndiscontinueAll}
        />
      )}

      {safeOpts.rankTable && viewMode === 'rank' && (
        <SalesRankTableSection
          opts={safeOpts}
          periodLabel={periodLabel}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          showRevenue={!!safeOpts.revenue}
          compareLabel={compareLabel}
          canEdit={canEdit}
          onMarkIrregular={onMarkIrregular}
          onUnmarkIrregular={onUnmarkIrregular}
          onUndiscontinue={onUndiscontinue}
        />
      )}

      {safeOpts.rankTable && viewMode === 'compare' && (
        <SalesCompareTableSection
          compareData={compareData}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          periodLabel={periodLabel}
          cmpPeriodLabel={cmpPeriodLabel}
        />
      )}

      {safeOpts.excluded && <SalesExcludedListSection excludedList={safeExcludedList} />}

      <div className="paper-foot">
        <span className="muted" style={{ fontSize: 11 }}>
          7번가 R&amp;D 플랫폼
        </span>
      </div>
    </>
  );
}
