import { RecipeMenuBlock } from './RecipeMenuBlock';

/**
 * 카테고리(피자/1인피자/세트박스/사이드/추가토핑) 하나의 레시피 출력 묶음.
 * 카테고리 제목 아래로 메뉴 블록들을 이어붙인다 — 다음 섹션은 항상 새 페이지에서
 * 시작한다(recipe-print-cat-section + recipe-print-cat-section, print.js).
 */
export function RecipeCategorySection({ section }) {
  const { categoryLabel, color, pagePerMenu, menus } = section;
  if (!menus.length) return null;
  return (
    <div className="paper-section recipe-print-cat-section">
      <div className="paper-section-title" style={{ borderBottomColor: color }}>
        <span
          className="dot"
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: color,
            display: 'inline-block',
            marginRight: 6,
          }}
        />
        {categoryLabel} · {menus.length}개 메뉴
      </div>
      {menus.map(menu => (
        <RecipeMenuBlock key={menu.id} menu={menu} pageBreak={pagePerMenu} />
      ))}
    </div>
  );
}
