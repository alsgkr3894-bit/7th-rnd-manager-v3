'use client';
import { useState, useEffect, useRef } from 'react';
import { COST_COMMON_GROUPS_ROUTE, COST_MARGIN_ROUTE, MENU_MASTER_ROUTE } from '@/lib/cost/routes';
import { MENU_SALES_ANALYSIS_ROUTE } from '@/lib/sales/navigation';
import { asDisplayText, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';
import { isRoleItemVisible } from '@/lib/navigation/role-visibility';

const CACHE_TTL = 30_000;
let _cache = { notes: null, samples: null, ingredients: null, at: 0 };

export const PALETTE_STATIC_ITEMS = [
  { kind: 'menu', label: '홈', href: '/' },
  { kind: 'menu', label: '메뉴판매량 순위 및 비교', href: MENU_SALES_ANALYSIS_ROUTE },
  { kind: 'menu', label: '메뉴판매량 업로드', href: '/menu-sales/upload', requiresEdit: true },
  { kind: 'menu', label: '미매칭 관리', href: '/menu-sales/unmatched' },
  { kind: 'menu', label: '제때 상품 가격 비교', href: '/jette/price-compare' },
  { kind: 'menu', label: '제때 출고량', href: '/jette/shipment' },
  { kind: 'menu', label: '메뉴 마스터', href: MENU_MASTER_ROUTE },
  { kind: 'menu', label: '원가마진표', href: COST_MARGIN_ROUTE },
  { kind: 'menu', label: '전체 원가 요약', href: '/cost/all-summary' },
  { kind: 'menu', label: '식자재 단가', href: '/ingredient/manage?view=price' },
  { kind: 'menu', label: '메뉴개발노트 목록', href: '/note' },
  { kind: 'menu', label: '노트 칸반 보드', href: '/note/board' },
  { kind: 'menu', label: '노트 작성', href: '/note/write', requiresEdit: true },
  { kind: 'menu', label: '판매량 보고서', href: '/report/sales' },
  { kind: 'menu', label: '원가계산 보고서', href: '/report/cost' },
  { kind: 'menu', label: '시스템 설정', href: '/settings/system' },
  { kind: 'menu', label: '데이터 백업', href: '/settings/backup' },
  { kind: 'action', label: '제때판매가 업로드', href: '/menu-sales/upload', requiresEdit: true },
  { kind: 'action', label: '새 테스트 노트 작성', href: '/note/write', requiresEdit: true },
  { kind: 'action', label: '새 샘플 작성', href: '/note/write?type=sample', requiresEdit: true },
  { kind: 'action', label: '데이터 백업 실행', href: '/settings/backup' },
  { kind: 'nav', label: '재료 단가 업데이트', href: '/ingredient/manage?view=price', icon: 'tag' },
  {
    kind: 'nav',
    label: '샘플 사진 추가',
    href: '/note/write?type=sample',
    icon: 'beaker',
    requiresEdit: true,
  },
  { kind: 'nav', label: '공통 원가 관리', href: COST_COMMON_GROUPS_ROUTE, icon: 'doc' },
];

const STAR_ICON = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const STATUS_ICON = {
  테스트: '🧪',
  아이디어: '💡',
  테스트중: '🧪',
  보류: '⏸',
  출시: '✅',
  폐기: '❌',
};

export { STATUS_ICON };

export function isPaletteItemVisibleForRole(item, canEdit = false) {
  return isRoleItemVisible(item, canEdit);
}

function detailPath(basePath, id) {
  const safeId = asDisplayText(id);
  return safeId ? `${basePath}/${safeId}` : basePath;
}

/** 팔레트 열릴 때 노트/샘플/식자재를 동적 로드해 반환하는 훅 (30초 캐시) */
export function usePaletteItems(open, { canEdit = false } = {}) {
  const [noteItems, setNoteItems] = useState(() => _cache.notes || []);
  const [sampleItems, setSampleItems] = useState(() => _cache.samples || []);
  const [ingredientItems, setIngredientItems] = useState(() => _cache.ingredients || []);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const now = Date.now();
    if (loadedRef.current && now - _cache.at < CACHE_TTL) return;
    loadedRef.current = true;

    import('@/lib/db')
      .then(({ initDB }) => initDB())
      .then(() =>
        Promise.all([
          import('@/lib/note').then(({ getAllNotesCached }) => getAllNotesCached()),
          import('@/lib/sample').then(({ getAllSamples }) => getAllSamples()),
        ])
      )
      .then(([notes, samples]) => {
        if (!alive) return;
        const mapped = asObjectArray(notes).map(n => {
          const title = asDisplayText(n.title || n.menuName, '제목 없음');
          const menuName = asDisplayText(n.menuName);
          const status = asDisplayText(n.status, '상태 없음');
          return {
            kind: 'note',
            label: title,
            sub: `${menuName} · ${status}`,
            href: detailPath('/note', n.id),
            status,
          };
        });
        const mappedS = asObjectArray(samples).map(s => {
          const title = asDisplayText(s.title || s.menuName, '샘플');
          const menuName = asDisplayText(s.menuName);
          const rating = clampInteger(s.rating, { min: 0, max: 5, fallback: 0 });
          return {
            kind: 'sample',
            label: title,
            sub: `${menuName} · ${rating > 0 ? STAR_ICON[rating] : '샘플'}`,
            href: detailPath('/note/sample', s.id),
            hasPhoto: asObjectArray(s.photos).some(p => asDisplayText(p.data)),
          };
        });
        _cache.notes = mapped;
        _cache.samples = mappedS;
        _cache.at = Date.now();
        setNoteItems(mapped);
        setSampleItems(mappedS);
      })
      .catch(e => {
        if (alive) console.warn('[palette] 노트/샘플 로드 실패:', e);
      });

    import('@/lib/ingredient')
      .then(({ getAllIngredients }) => getAllIngredients())
      .then(items => {
        if (!alive) return;
        const mapped = asObjectArray(items)
          .filter(m => !m.discontinued && !m.excluded)
          .map(i => {
            const name = asDisplayText(
              i.ingredientName || i.displayName || i.productCode,
              '식자재'
            );
            const query = encodeURIComponent(name);
            const highlight = i.id != null ? `&highlight=${encodeURIComponent(i.id)}` : '';
            const productCode = asDisplayText(i.productCode);
            const productCodeParam = productCode
              ? `&productCode=${encodeURIComponent(productCode)}`
              : '';
            return {
              kind: 'ingredient',
              label: name,
              sub: `${asDisplayText(i.category)} · ${asDisplayText(i.productCode, '수동')}`,
              href: `/ingredient/manage?query=${query}${highlight}${productCodeParam}`,
            };
          });
        _cache.ingredients = mapped;
        setIngredientItems(mapped);
      })
      .catch(e => {
        if (alive) console.warn('[palette] 식자재 로드 실패:', e);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  return [...PALETTE_STATIC_ITEMS, ...noteItems, ...sampleItems, ...ingredientItems].filter(item =>
    isPaletteItemVisibleForRole(item, canEdit)
  );
}
