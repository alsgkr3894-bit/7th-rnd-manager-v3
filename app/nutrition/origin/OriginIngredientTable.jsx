import Link from 'next/link';
import { Icon } from '@/components/icons';
import { getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const EMPTY_MENU_MAP = new Map();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);

export function OriginIngredientTable({ ingredientRows, mapData, isExcludedMenu }) {
  if (ingredientRows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Icon.tag style={{ width: 28, height: 28 }} />
        </div>
        <div className="empty-title">원산지 등록 식자재가 없어요</div>
        <div className="empty-sub">
          <Link href="/ingredient/manage">식자재 관리</Link>에서 식자재별 원산지를 입력하세요
        </div>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>식자재명</th>
          <th>표시품목명</th>
          <th>원산지</th>
          <th>제때 코드</th>
          <th>매칭 메뉴 수</th>
          <th>매칭 메뉴 (일부)</th>
        </tr>
      </thead>
      <tbody>
        {ingredientRows.map(ingredient => {
          const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
          const productCode = asDisplayText(ingredient.productCode);
          const ingredientName = asDisplayText(ingredient.ingredientName);
          const origins = asObjectArray(ingredient.origin);
          const allMenus = getMenusForIngredient(ingredientToMenus, productCode, ingredientName);
          const menus = new Map(
            [...allMenus].filter(([menuCode, menu]) => !isExcludedMenu(menuCode, menu?.menuName))
          );
          const menuList = [...menus.values()];
          return (
            <tr key={asDisplayText(ingredient.id) || productCode || ingredientName}>
              <td style={{ fontWeight: 600 }}>{ingredientName}</td>
              <td style={{ color: 'var(--text-2)' }}>
                {origins.map(item => asDisplayText(item.displayName) || ingredientName).join(' · ')}
              </td>
              <td>
                {origins.map((item, index) => (
                  <span key={index}>
                    {index > 0 && (
                      <span style={{ color: 'var(--text-4)', margin: '0 4px' }}>/</span>
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                      {asDisplayText(item.country)}
                    </span>
                  </span>
                ))}
              </td>
              <td className="mono muted">{productCode || '—'}</td>
              <td style={{ textAlign: 'center' }}>
                {menus.size > 0 ? (
                  <span style={{ fontWeight: 700, color: 'var(--positive)' }}>{menus.size}</span>
                ) : (
                  <span style={{ color: 'var(--text-4)' }}>0</span>
                )}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {menuList
                  .slice(0, 3)
                  .map(menu => asDisplayText(menu?.menuName))
                  .join(', ')}
                {menuList.length > 3 && ` 외 ${menuList.length - 3}개`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
