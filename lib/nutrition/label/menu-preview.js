/**
 * lib/nutrition/label/menu-preview.js — 메뉴마스터 수정 모달의 "영양성분 출력 미리보기" 계산.
 *
 * app/nutrition/export(전체 출력 페이지)와 같은 buildXxxSheet 빌더를 그대로 써서
 * 실제 라벨에 나가는 값과 항상 같은 숫자를 보여준다. 새 계산식은 만들지 않는다.
 *
 * menu_master의 menuCode(사이즈 접미사 포함, 예: P-PS-002-L)와 nutrition_menu_ref의
 * menuCode(대개 base 코드)는 별도로 큐레이션되는 서로 다른 스토어라 base 코드로 매칭한다
 * — lib/menu-master/readiness.js의 checkNutrition과 같은 규칙.
 */
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { toppingNameMatchKey } from '@/lib/nutrition/values/store';
import { buildPizzaSheet, buildSideSheet, buildBeverageSheet, buildToppingSheet } from './build';

function stripSizeSuffix(code) {
  return String(code || '').replace(/-(?:L|R)$/i, '');
}

// 세트박스·하프앤하프는 특정 메뉴 하나가 아니라 전체 피자 카탈로그의 최소~최대 범위,
// 세트 구성 조합으로 계산되는 표라 "이 메뉴 하나의 출력값"이라는 개념이 없다.
// 해당 카테고리는 전체 출력 페이지로 안내한다.
const PREVIEW_SUPPORTED_GROUPS = new Set(['피자', '사이드', '음료', '추가토핑']);

/**
 * @param {object} ctx buildNutritionLabelContext() 결과
 * @param {{menuCode:string, menuName?:string, category?:string}} menu 메뉴마스터 행
 * @returns {{ supported:boolean, group:string, rows:Array, missing?:boolean }}
 */
export function buildMenuNutritionPreview(ctx, menu) {
  const group = resolveNutritionGroup(
    { menuCode: menu?.menuCode, category: menu?.category },
    ctx?.masterByCode || {}
  );
  if (!PREVIEW_SUPPORTED_GROUPS.has(group)) {
    return { supported: false, group, rows: [] };
  }

  const baseCode = stripSizeSuffix(menu?.menuCode);

  if (group === '추가토핑') {
    // nutrition_topping_master는 menu_master와 별도 코드 체계다. 토핑 편집 화면에서 사용자가
    // 직접 연결한 linkedMenuCode가 있으면 그걸 우선 쓰고(정확), 없으면 이름으로 폴백한다.
    // buildToppingSheet는 legacy fallback을 위해 전체 menus(menuRefs)도 필요로 한다.
    const menuNameKey = toppingNameMatchKey(menu?.menuName);
    const rows = buildToppingSheet({ ...ctx, menus: ctx?.menuRefs }).filter(row => {
      const rowBase = stripSizeSuffix(row.menuCode);
      const linkedBase = stripSizeSuffix(row.linkedMenuCode);
      if (linkedBase) return linkedBase === baseCode;
      return (
        rowBase === baseCode || (menuNameKey && toppingNameMatchKey(row.menuName) === menuNameKey)
      );
    });
    return { supported: true, group, rows, missing: rows.length === 0 };
  }

  const menus = (Array.isArray(ctx?.menuRefs) ? ctx.menuRefs : []).filter(
    m => stripSizeSuffix(m.menuCode) === baseCode
  );
  if (menus.length === 0) {
    return { supported: true, group, rows: [], missing: true };
  }

  const previewCtx = { ...ctx, menus };
  if (group === '피자') {
    // buildPizzaSheet는 메뉴당 하나의 { menuName, menuCode, rows:[크러스트별 행] } 묶음을 반환한다
    // — 미리보기는 크러스트별 행만 필요하므로 풀어서 반환한다.
    const rows = buildPizzaSheet(previewCtx).flatMap(entry => entry.rows);
    return { supported: true, group, rows };
  }
  if (group === '사이드') return { supported: true, group, rows: buildSideSheet(previewCtx) };
  return { supported: true, group, rows: buildBeverageSheet(previewCtx) };
}
