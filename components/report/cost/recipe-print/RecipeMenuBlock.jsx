import { recipePrintCategoryColor } from '@/lib/report/recipe-print-categories';
import { RecipeComponentTable } from './RecipeComponentTable';
import {
  commonComponentsOf,
  directComponentsOf,
  formatIngredientUsage,
  money,
} from './recipePrintFormat';

/**
 * 메뉴 1개의 레시피 출력 블록. pageBreak=true(피자/1인피자, "메뉴당 1페이지" 켜짐)면
 * 페이지 중간에서 잘리지 않고 다음 메뉴 앞에서 항상 새 페이지로 넘어간다
 * (recipe-print-menu-page). pageBreak=false면 카테고리 섹션 안에서 자연스럽게
 * 이어지는 블록(recipe-print-menu-block)으로 렌더한다.
 */
export function RecipeMenuBlock({ menu, pageBreak = true }) {
  const directComponents = directComponentsOf(menu);
  const commonComponents = commonComponentsOf(menu);
  const categoryLabel = menu.categoryLabel || '기타';
  const sizes = Array.isArray(menu.sizes) && menu.sizes.length ? menu.sizes : ['단일'];
  const color = recipePrintCategoryColor(menu.kind || categoryLabel);

  return (
    <div
      className={
        'paper-section ' + (pageBreak ? 'recipe-print-menu-page' : 'recipe-print-menu-block')
      }
    >
      <div
        className="paper-section-title recipe-print-menu-title"
        style={{ borderBottomColor: color }}
      >
        <span className="recipe-print-title-main">
          <span
            className="dot"
            style={{ width: 10, height: 10, borderRadius: 3, background: color }}
          />
          <span>{menu.menuName || '—'}</span>
        </span>
        <span className="recipe-print-title-meta">
          {categoryLabel} · {menu.menuCode || '코드 없음'} · 규격 {sizes.join('/')}
        </span>
      </div>

      <div className="recipe-usage-box">
        <div className="recipe-usage-label">직접 입력 식자재</div>
        <div
          className="recipe-usage-summary"
          style={{ marginBottom: commonComponents.length ? 8 : 0 }}
        >
          {directComponents.length === 0 ? (
            <span className="muted">구성품 미작성</span>
          ) : (
            directComponents.map((component, index) => (
              <span className="recipe-usage-part" key={component.key || index}>
                <span className="recipe-usage-token">
                  {formatIngredientUsage(component, sizes)}
                </span>
                {index < directComponents.length - 1 && (
                  <span className="recipe-usage-arrow">→</span>
                )}
              </span>
            ))
          )}
        </div>
        {commonComponents.length > 0 && (
          <>
            <div className="recipe-usage-label">공통관리 구성</div>
            <div className="recipe-usage-summary">
              {commonComponents.map((component, index) => (
                <span className="recipe-usage-part" key={component.key || index}>
                  <span className="recipe-usage-token">
                    {(component.sourceLabel || '공통관리') + ' · '}
                    {formatIngredientUsage(component, sizes)}
                  </span>
                  {index < commonComponents.length - 1 && (
                    <span className="recipe-usage-arrow">→</span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <RecipeComponentTable
        title="직접 입력 식자재"
        emptyText="직접 입력한 식자재가 없습니다"
        components={directComponents}
        sizes={sizes}
        menu={menu}
      />

      {commonComponents.length > 0 && (
        <RecipeComponentTable
          title="공통관리 구성"
          emptyText="공통관리 구성품이 없습니다"
          components={commonComponents}
          sizes={sizes}
          menu={menu}
          showSource
        />
      )}

      <table className="paper-table recipe-print-table" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td colSpan={3} style={{ fontWeight: 800 }}>
              메뉴 합계
            </td>
            <td className="num right" style={{ width: 84, fontWeight: 800 }}>
              {money(menu.totalCost)}
            </td>
            <td className="muted" style={{ width: '16%' }}>
              직접 {directComponents.length}개 · 공통 {commonComponents.length}개
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
