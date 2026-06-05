'use client';
import { useState, useEffect, useRef } from 'react';

const CACHE_TTL = 30_000;
let _cache = { notes: null, samples: null, ingredients: null, at: 0 };

const STATIC_ITEMS = [
  { kind: 'menu',   label: '홈',                      href: '/' },
  { kind: 'menu',   label: '메뉴판매량 순위',          href: '/menu-sales/rank' },
  { kind: 'menu',   label: '메뉴판매량 업로드',        href: '/menu-sales/upload' },
  { kind: 'menu',   label: '메뉴판매량 비교',          href: '/menu-sales/compare' },
  { kind: 'menu',   label: '미매칭 관리',              href: '/menu-sales/unmatched' },
  { kind: 'menu',   label: '제때 상품 가격 비교',      href: '/jette/price-compare' },
  { kind: 'menu',   label: '제때 출고량',              href: '/jette/shipment' },
  { kind: 'menu',   label: '피자 원가표',              href: '/cost/pizza' },
  { kind: 'menu',   label: '전체 원가 요약',           href: '/cost/all-summary' },
  { kind: 'menu',   label: '식자재 원가표',            href: '/cost/ingredient-price' },
  { kind: 'menu',   label: '메뉴개발노트 목록',        href: '/note' },
  { kind: 'menu',   label: '연구일지',                 href: '/note/journal' },
  { kind: 'menu',   label: '노트 칸반 보드',           href: '/note/board' },
  { kind: 'menu',   label: '노트 작성',                href: '/note/write' },
  { kind: 'menu',   label: '샘플기록',                 href: '/note/sample' },
  { kind: 'menu',   label: '판매량 보고서',            href: '/report/sales' },
  { kind: 'menu',   label: '원가계산 보고서',          href: '/report/cost' },
  { kind: 'menu',   label: '시스템 설정',              href: '/settings/system' },
  { kind: 'menu',   label: '데이터 백업',              href: '/settings/backup' },
  { kind: 'action', label: '제때판매가 업로드',        href: '/menu-sales/upload' },
  { kind: 'action', label: '새 테스트 노트 작성',      href: '/note/write' },
  { kind: 'action', label: '새 샘플 작성',             href: '/note/sample/write' },
  { kind: 'action', label: '데이터 백업 실행',         href: '/settings/backup' },
  { kind: 'nav',    label: '재료 단가 업데이트',       href: '/cost/ingredient-price', icon: 'tag' },
  { kind: 'nav',    label: '샘플 사진 추가',           href: '/note/sample/write',     icon: 'beaker' },
  { kind: 'nav',    label: '원가 레시피 관리',         href: '/cost/recipe',           icon: 'doc' },
];

const STAR_ICON = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const STATUS_ICON = {
  '아이디어':'💡','테스트중':'🧪','재테스트':'🔄',
  '보고예정':'📋','보류':'⏸','출시':'✅','폐기':'❌',
};

export { STATUS_ICON };

/** 팔레트 열릴 때 노트/샘플/식자재를 동적 로드해 반환하는 훅 (30초 캐시) */
export function usePaletteItems(open) {
  const [noteItems,       setNoteItems]       = useState(() => _cache.notes       || []);
  const [sampleItems,     setSampleItems]     = useState(() => _cache.samples     || []);
  const [ingredientItems, setIngredientItems] = useState(() => _cache.ingredients || []);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // 팔레트가 닫힐 때 플래그를 초기화해 다음 열림 시 항상 최신 데이터를 로드한다
      loadedRef.current = false;
      return;
    }
    const now = Date.now();
    if (loadedRef.current && now - _cache.at < CACHE_TTL) return;
    loadedRef.current = true;

    import('@/lib/db').then(({ initDB }) => initDB())
      .then(() => Promise.all([
        import('@/lib/note').then(({ getAllNotes }) => getAllNotes()),
        import('@/lib/sample').then(({ getAllSamples }) => getAllSamples()),
      ]))
      .then(([notes, samples]) => {
        const mapped = notes.map(n => ({
          kind: 'note', label: n.title,
          sub: `${n.menuName || ''} · ${n.status}`,
          href: `/note/${n.id}`, status: n.status,
        }));
        const mappedS = samples.map(s => ({
          kind: 'sample', label: s.title,
          sub: `${s.menuName || ''} · ${s.rating > 0 ? STAR_ICON[s.rating] : '샘플'}`,
          href: `/note/sample/${s.id}`,
          hasPhoto: (s.photos?.length || 0) > 0,
        }));
        _cache.notes = mapped; _cache.samples = mappedS; _cache.at = Date.now();
        setNoteItems(mapped);
        setSampleItems(mappedS);
      })
      .catch(e => console.warn('[palette] 노트/샘플 로드 실패:', e));

    import('@/lib/ingredient').then(({ getAllIngredients }) => getAllIngredients())
      .then(items => {
        const mapped = items.filter(m => !m.discontinued && !m.excluded).map(i => ({
          kind: 'ingredient', label: i.ingredientName,
          sub: `${i.category || ''} · ${i.productCode || '수동'}`,
          href: '/ingredient/manage',
        }));
        _cache.ingredients = mapped;
        setIngredientItems(mapped);
      })
      .catch(e => console.warn('[palette] 식자재 로드 실패:', e));
  }, [open]);

  return [...STATIC_ITEMS, ...noteItems, ...sampleItems, ...ingredientItems];
}
