'use client';
import SalesKpiCards from '@/components/report/SalesKpiCards';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { SalesCategoryShareSection } from './SalesCategoryShareSection';
import { SalesCompareTableSection } from './SalesCompareTableSection';
import { SalesExcludedListSection } from './SalesExcludedListSection';
import { SalesPizzaMoverSection } from './SalesPizzaMoverSection';
import { SalesRankTableSection } from './SalesRankTableSection';

function scopeLabel(scope) {
  return scope === 'all' ? '전체 메뉴' : asDisplayText(scope, '전체 메뉴');
}

export default function SalesReportPreview({
  periodLabel,
  scope,
  viewMode,
  cmpYear,
  cmpMonth,
  todayLabel,
  profileName,
  opts,
  kpi,
  catShares,
  groupRanking,
  totalShare,
  compareData,
  excludedList,
}) {
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  const safeExcludedList = Array.isArray(excludedList) ? excludedList : [];

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
        <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
        <div className="paper-meta">
          <span>대상: {scopeLabel(scope)}</span>
          <span>·</span>
          <span>
            {viewMode === 'compare' ? `비교: ${cmpYear}년 ${cmpMonth}월` : '해당 월 순위'}
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
        <SalesPizzaMoverSection catShares={safeCatShares} groupRanking={safeGroupRanking} />
      )}

      {safeOpts.rankTable && viewMode === 'rank' && (
        <SalesRankTableSection
          opts={safeOpts}
          periodLabel={periodLabel}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          showRevenue={!!safeOpts.revenue}
        />
      )}

      {safeOpts.rankTable && viewMode === 'compare' && (
        <SalesCompareTableSection
          compareData={compareData}
          catShares={safeCatShares}
          groupRanking={safeGroupRanking}
          periodLabel={periodLabel}
          cmpYear={cmpYear}
          cmpMonth={cmpMonth}
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
