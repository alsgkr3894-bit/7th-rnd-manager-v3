import { formatNumber } from '@/lib/format';
import { buildRecipePrintMenus } from '@/lib/report/build-cost-report';

const CATEGORY_COLORS = {
  피자: '#3182F6',
  '1인피자': '#10B981',
  세트박스: '#EC4899',
  사이드: '#F59E0B',
};

function formatQty(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? formatNumber(n) : formatNumber(Math.round(n * 1000) / 1000);
}

function money(value) {
  return value > 0 ? `${formatNumber(value)}원` : '—';
}

function formatQtyWithUnit(value, unit) {
  const n = Number(value);
  const safeValue = Number.isFinite(n) ? n : 0;
  return `${formatQty(safeValue)}${unit || 'g'}`;
}

function formatSizeUsage(component, sizes) {
  const labels = Array.isArray(sizes) && sizes.length ? sizes : ['단일'];
  return labels
    .map(size => {
      const entry = component.sizeQuantities?.[size] || { quantity: 0, unit: component.unit || 'g' };
      return `${size}:${formatQtyWithUnit(entry.quantity, entry.unit || component.unit || 'g')}`;
    })
    .join('/');
}

function formatIngredientUsage(component, sizes) {
  const name = component.ingredientName || '—';
  return `${name}(${formatSizeUsage(component, sizes)})`;
}

export function RecipePrintView({ recipeRows, recipeMenus }) {
  const rows = Array.isArray(recipeRows) ? recipeRows : [];
  const menus = Array.isArray(recipeMenus) ? recipeMenus : buildRecipePrintMenus(rows);
  const completed = menus.filter(menu => menu.componentCount > 0);
  const componentCount = menus.reduce((sum, menu) => sum + menu.componentCount, 0);
  const totalCost = menus.reduce((sum, menu) => sum + (menu.totalCost || 0), 0);

  return (
    <>
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
            출력할 레시피가 없습니다
          </div>
        </div>
      ) : (
        menus.map(menu => <RecipeMenuPage key={menu.id} menu={menu} />)
      )}
    </>
  );
}

function RecipeMenuPage({ menu }) {
  const components = Array.isArray(menu.components) ? menu.components : [];
  const categoryLabel = menu.categoryLabel || '기타';
  const sizes = Array.isArray(menu.sizes) && menu.sizes.length ? menu.sizes : ['단일'];

  return (
    <div className="paper-section recipe-print-menu-page">
      <div
        className="paper-section-title recipe-print-menu-title"
        style={{
          borderBottomColor: CATEGORY_COLORS[categoryLabel] || 'var(--border)',
        }}
      >
        <span className="recipe-print-title-main">
          <span
            className="dot"
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: CATEGORY_COLORS[categoryLabel] || 'var(--text-3)',
            }}
          />
          <span>{menu.menuName || '—'}</span>
        </span>
        <span className="recipe-print-title-meta">
          {categoryLabel} · {menu.menuCode || '코드 없음'} · 규격 {sizes.join('/')}
        </span>
      </div>

      <div className="recipe-usage-box">
        <div className="recipe-usage-label">사이즈별 사용량</div>
        <div className="recipe-usage-summary">
          {components.length === 0 ? (
            <span className="muted">구성품 미작성</span>
          ) : (
            components.map((component, index) => (
              <span className="recipe-usage-part" key={component.key || index}>
                <span className="recipe-usage-token">{formatIngredientUsage(component, sizes)}</span>
                {index < components.length - 1 && <span className="recipe-usage-arrow">→</span>}
              </span>
            ))
          )}
        </div>
      </div>

      <table className="paper-table recipe-print-table">
        <thead>
          <tr>
            <th style={{ width: '24%' }}>원가식자재</th>
            <th style={{ width: '18%' }}>제품코드</th>
            <th>사이즈별 사용량</th>
            <th style={{ width: 84, textAlign: 'right' }}>소계</th>
            <th style={{ width: '16%' }}>비고</th>
          </tr>
        </thead>
        <tbody>
          {components.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                구성품 미작성
              </td>
            </tr>
          ) : (
            components.map(component => (
              <tr key={component.key}>
                <td style={{ fontWeight: 700 }}>{component.ingredientName || '—'}</td>
                <td className="mono muted" style={{ fontSize: 10 }}>
                  {component.productCode || '—'}
                </td>
                <td>{formatSizeUsage(component, sizes)}</td>
                <td className="num right">{money(component.totalCost)}</td>
                <td className="muted">{component.note || menu.note || '—'}</td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={3} style={{ fontWeight: 800 }}>
              메뉴 합계
            </td>
            <td className="num right" style={{ fontWeight: 800 }}>
              {money(menu.totalCost)}
            </td>
            <td className="muted">{components.length}개 식자재</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
