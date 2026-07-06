'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asMenuMap } from '@/lib/nutrition/allergen/matrix';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';

const actionLinkStyle = { display: 'inline-flex', alignItems: 'center', minHeight: 24 };

export function AllergenIngredientTable({ ingredientRows, mapData, isExcludedMenu }) {
  if (ingredientRows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Icon.beaker style={{ width: 28, height: 28 }} />
        </div>
        <div className="empty-title">알레르기 등록 식자재가 없어요</div>
        <div className="empty-sub">
          <Link href="/ingredient/manage" style={actionLinkStyle}>
            식자재 관리
          </Link>
          에서 식자재별 알레르기를 체크하세요
        </div>
      </div>
    );
  }

  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>식자재명</th>
          <th>제때 코드</th>
          <th>알레르기 항목</th>
          <th>매칭 메뉴 수</th>
        </tr>
      </thead>
      <tbody>
        {ingredientRows.map(ing => {
          const productCode = asDisplayText(ing.productCode);
          const ingredientName = asDisplayText(ing.ingredientName);
          const ingredientAllergens = asStringArray(ing.allergens);
          const allMenus = getMenusForIngredient(ingredientToMenus, productCode, ingredientName);
          const menus = new Map(
            [...allMenus].filter(([menuCode, menu]) => !isExcludedMenu(menuCode, menu?.menuName))
          );
          const allergenNames = ALLERGEN_SEED.filter(a =>
            ingredientAllergens.includes(a.allergenCode)
          ).map(a => asDisplayText(a.allergenName));

          return (
            <tr key={asDisplayText(ing.id) || productCode || ingredientName}>
              <td style={{ fontWeight: 600 }}>{ingredientName}</td>
              <td className="mono muted">{productCode || '—'}</td>
              <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {allergenNames.map(name => (
                    <span
                      key={name}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'var(--accent)',
                        color: 'var(--surface)',
                        fontWeight: 700,
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                {menus.size > 0 ? (
                  <span style={{ fontWeight: 700, color: 'var(--positive)' }}>{menus.size}</span>
                ) : (
                  <span style={{ color: 'var(--text-4)' }}>0</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
