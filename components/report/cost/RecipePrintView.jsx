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
      const entry = component.sizeQuantities?.[size] || {
        quantity: 0,
        unit: component.unit || 'g',
      };
      return `${size}:${formatQtyWithUnit(entry.quantity, entry.unit || component.unit || 'g')}`;
    })
    .join('/');
}

function formatIngredientUsage(component, sizes) {
  const name = component.ingredientName || '—';
  return `${name}(${formatSizeUsage(component, sizes)})`;
}

function directComponentsOf(menu) {
  return (Array.isArray(menu.components) ? menu.components : []).filter(
    component => component.sourceType !== 'common'
  );
}

function commonComponentsOf(menu) {
  return (Array.isArray(menu.components) ? menu.components : []).filter(
    component => component.sourceType === 'common'
  );
}

function sectionCost(components) {
  return components.reduce((sum, component) => sum + (component.totalCost || 0), 0);
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
  const directComponents = directComponentsOf(menu);
  const commonComponents = commonComponentsOf(menu);
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
        <div className="recipe-usage-label">직접 입력 식자재</div>
        <div className="recipe-usage-summary" style={{ marginBottom: commonComponents.length ? 8 : 0 }}>
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

function RecipeComponentTable({ title, emptyText, components, sizes, menu, showSource = false }) {
  return (
    <table className="paper-table recipe-print-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th colSpan={5} style={{ fontWeight: 800, background: 'var(--surface-2)' }}>
            {title} · {money(sectionCost(components))}
          </th>
        </tr>
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
              {emptyText}
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
              <td className="muted">
                {showSource ? component.sourceLabel || '공통관리' : component.note || menu.note || '—'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
