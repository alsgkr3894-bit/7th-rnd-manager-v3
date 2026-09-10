/**
 * lib/nutrition/values/personal-pizza-migration.js — 1인용피자 크러스트 이관.
 *
 * 과거엔 1인용피자 영양성분을 일반 씬바샤삭(씬바사삭L)에 함께 입력했다
 * (import 매칭 규칙이 그렇게 몰아넣었다). 이제 1인용피자 전용 슬롯
 * (crust-config.js의 PERSONAL_PIZZA_CRUST_CODE)이 생겼으니, 씬바사삭L로
 * 저장된 행 중 1인용피자로 식별되는 것만 새 크러스트로 옮긴다.
 *
 * 멱등적으로 설계했다 — 이미 옮겨진 행은 더 이상 씬바사삭L이 아니므로
 * 재실행해도 아무 일도 하지 않는다. 별도 마이그레이션 플래그 불필요.
 * normalizePersonalPizzaCodes(lib/menu-master/normalize.js)와 같은 패턴 —
 * 관리자 권한 없이 페이지 로드 시 자동 실행되는 무해한 데이터 보정.
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { THIN_CRUST_CODE, PERSONAL_PIZZA_CRUST_CODE } from '@/lib/nutrition/crust-config';

/**
 * P-ONE 코드거나 메뉴명에 1인용/1인피자가 들어있으면 1인용피자로 본다.
 * lib/nutrition/menu-group.js의 isPersonalPizzaMenu와 같은 신호를 쓰되,
 * 여기는 menu_master 조인 없이 raw_values 행 자체(menuCode/menuName)만으로 판정한다
 * — 1인피자 menuCode는 애초에 사이즈 접미사가 없어(P-ONE-NNN) 그대로 base 코드다.
 */
function isPersonalPizzaRawRow(row) {
  const code = String(row?.menuCode || '');
  const name = String(row?.menuName || '');
  return code.startsWith('P-ONE') || name.includes('1인용') || name.includes('1인피자');
}

export async function migratePersonalPizzaCrustType() {
  if (!hasStore('nutrition_raw_values')) return { migrated: 0 };
  const rows = await getAll('nutrition_raw_values');
  const targets = rows.filter(
    row => row?.crustType === THIN_CRUST_CODE && isPersonalPizzaRawRow(row)
  );
  if (targets.length === 0) return { migrated: 0 };

  const timestamp = new Date().toISOString();
  await runTransaction(['nutrition_raw_values'], 'readwrite', tx => {
    const store = tx.objectStore('nutrition_raw_values');
    for (const row of targets) {
      store.put({ ...row, crustType: PERSONAL_PIZZA_CRUST_CODE, updatedAt: timestamp });
    }
  });

  return { migrated: targets.length };
}
