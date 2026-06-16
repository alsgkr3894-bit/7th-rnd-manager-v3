import { getProfile } from '@/lib/profile';
import { CostReportView } from './CostReportView';
import { CostTableView } from './CostTableView';
import { RecipePrintView } from './RecipePrintView';

export function CostReportPreview({
  viewTab,
  onViewTab,
  activeCats,
  totalCount,
  recipeMenus,
  riskThreshold,
  opts,
  catStats,
  allAvg,
  allRisk,
  allMaxRate,
  riskMenus,
  diagnostics,
  recipeRows,
  viewLabel,
}) {
  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · 원가관리</div>
        <h2 className="paper-title">
          {viewTab === 'recipe' ? '7번가피자 레시피 출력' : '7번가피자 제품원가표 (단가 기준)'}
        </h2>
        <div className="paper-meta">
          <span>
            대상: {activeCats.length}개 카테고리 · {totalCount}개 메뉴
          </span>
          {viewTab === 'recipe' && (
            <>
              <span>·</span>
              <span>레시피 {recipeMenus.length}메뉴</span>
            </>
          )}
          <span>·</span>
          <span>위험 기준 {riskThreshold}%↑</span>
          <span>·</span>
          <span className="mono">
            단가 기준 {new Date().toLocaleDateString('ko-KR').slice(0, -1)} · {getProfile().name}
          </span>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 4, margin: '4px 0 12px' }}>
        <button
          className={`btn sm ${viewTab === 'report' ? 'primary' : 'ghost'}`}
          onClick={() => onViewTab('report')}
        >
          원가계산 보고서
        </button>
        <button
          className={`btn sm ${viewTab === 'costTable' ? 'primary' : 'ghost'}`}
          onClick={() => onViewTab('costTable')}
        >
          제품원가표
        </button>
        <button
          className={`btn sm ${viewTab === 'recipe' ? 'primary' : 'ghost'}`}
          onClick={() => onViewTab('recipe')}
        >
          레시피 출력
        </button>
      </div>

      {viewTab === 'report' && (
        <CostReportView
          opts={opts}
          catStats={catStats}
          totalCount={totalCount}
          allAvg={allAvg}
          allRisk={allRisk}
          allMaxRate={allMaxRate}
          riskThreshold={riskThreshold}
          activeCats={activeCats}
          riskMenus={riskMenus}
          diagnostics={diagnostics}
        />
      )}

      {viewTab === 'costTable' && (
        <CostTableView activeCats={activeCats} riskThreshold={riskThreshold} />
      )}

      {viewTab === 'recipe' && (
        <RecipePrintView recipeRows={recipeRows} recipeMenus={recipeMenus} />
      )}

      <div className="paper-foot">
        <span>{viewLabel}</span>
        <span className="mono">7번가 R&amp;D 플랫폼</span>
      </div>
    </>
  );
}
