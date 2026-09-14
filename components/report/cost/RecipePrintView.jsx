import { formatNumber } from '@/lib/format';
import { RecipeCategorySection } from './recipe-print';

/**
 * 레시피 출력 뷰 — 선택된 카테고리 섹션(sections)을 그대로 렌더한다.
 * hideOverview=true면 통계 헤더를 숨긴다(원가계산 보고서 부록으로 붙을 때 사용 —
 * 부록에는 이미 본문에 요약이 있어 중복 통계가 필요 없다).
 */
export function RecipePrintView({ sections = [], hideOverview = false }) {
  const menus = sections.flatMap(section => section.menus);
  const completed = menus.filter(menu => menu.componentCount > 0);
  const componentCount = menus.reduce((sum, menu) => sum + menu.componentCount, 0);
  const totalCost = menus.reduce((sum, menu) => sum + (menu.totalCost || 0), 0);

  return (
    <>
      {!hideOverview && (
        <div
          className="paper-stat-row recipe-print-overview"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          <div className="paper-stat">
            <div className="paper-stat-label">레시피</div>
            <div className="paper-stat-val num">
              {menus.length > 0 ? formatNumber(menus.length) : '—'}
              <span className="unit">{menus.length > 0 ? '메뉴' : ''}</span>
            </div>
            <div className="paper-stat-foot">메뉴 단위 출력</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">작성완료</div>
            <div className="paper-stat-val num">
              {completed.length > 0 ? formatNumber(completed.length) : '—'}
              <span className="unit">{completed.length > 0 ? '건' : ''}</span>
            </div>
            <div className="paper-stat-foot">구성품 입력 기준</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">구성품</div>
            <div className="paper-stat-val num">
              {componentCount > 0 ? formatNumber(componentCount) : '—'}
              <span className="unit">{componentCount > 0 ? '개' : ''}</span>
            </div>
            <div className="paper-stat-foot">중복 식자재 합산</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">레시피 원가 합계</div>
            <div className="paper-stat-val num">
              {totalCost > 0 ? formatNumber(totalCost) : '—'}
              <span className="unit">{totalCost > 0 ? '원' : ''}</span>
            </div>
            <div className="paper-stat-foot">사이즈 합산</div>
          </div>
        </div>
      )}

      {menus.length === 0 ? (
        <div className="paper-section">
          <div className="paper-section-title">레시피 출력</div>
          <div
            style={{
              height: 80,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-4)',
              fontSize: 13,
            }}
          >
            선택된 레시피가 없습니다
          </div>
        </div>
      ) : (
        sections.map(section => <RecipeCategorySection key={section.key} section={section} />)
      )}
    </>
  );
}
