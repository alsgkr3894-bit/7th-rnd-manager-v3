'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

const STATIC_ITEMS = [
  { kind: 'menu',   label: '홈',                      href: '/' },
  { kind: 'menu',   label: '메뉴판매량 순위',          href: '/menu-sales/rank' },
  { kind: 'menu',   label: '메뉴판매량 업로드',        href: '/menu-sales/upload' },
  { kind: 'menu',   label: '메뉴판매량 비교',          href: '/menu-sales/compare' },
  { kind: 'menu',   label: '미매칭 관리',              href: '/menu-sales/unmatched' },
  { kind: 'menu',   label: '제때 상품 가격 비교',      href: '/jette/price-compare' },
  { kind: 'menu',   label: '제때 출고량',              href: '/jette/shipment' },
  { kind: 'menu',   label: '피자 종합 원가표',         href: '/cost/pizza-summary' },
  { kind: 'menu',   label: '피자 세부 원가표',         href: '/cost/pizza-detail' },
  { kind: 'menu',   label: '식자재 원가표',            href: '/cost/ingredient-price' },
  { kind: 'menu',   label: '메뉴개발노트 목록',        href: '/note' },
  { kind: 'menu',   label: '노트 칸반 보드',           href: '/note/board' },
  { kind: 'menu',   label: '노트 작성',                href: '/note/write' },
  { kind: 'menu',   label: '판매량 보고서',            href: '/report/sales' },
  { kind: 'menu',   label: '원가계산 보고서',          href: '/report/cost' },
  { kind: 'menu',   label: '시스템 설정',              href: '/settings/system' },
  { kind: 'menu',   label: '데이터 백업',              href: '/settings/backup' },
  { kind: 'action', label: '제때판매가 업로드',        href: '/menu-sales/upload' },
  { kind: 'action', label: '새 테스트 노트 작성',      href: '/note/write' },
  { kind: 'action', label: '데이터 백업 실행',         href: '/settings/backup' },
];

const STATUS_ICON = {
  '아이디어': '💡', '테스트중': '🧪', '재테스트': '🔄',
  '보고예정': '📋', '보류': '⏸', '출시': '✅', '폐기': '❌',
};

export default function CommandPalette({ open, onClose }) {
  const [q,         setQ]         = useState('');
  const [noteItems, setNoteItems] = useState([]);
  const inputRef = useRef(null);
  const router   = useRouter();

  useEffect(() => {
    if (!open) return;
    setQ('');
    setTimeout(() => inputRef.current?.focus(), 30);
    // 노트 동적 로드
    import('@/lib/db').then(({ initDB }) => initDB())
      .then(() => import('@/lib/note').then(({ getAllNotes }) => getAllNotes()))
      .then(notes => {
        setNoteItems(notes.map(n => ({
          kind: 'note',
          label: n.title,
          sub: `${n.menuName || ''} · ${n.status}`,
          href: `/note/${n.id}`,
          status: n.status,
        })));
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const norm = s => s.toLowerCase().replace(/\s+/g, '');
  const all  = [...STATIC_ITEMS, ...noteItems];
  const filtered = q.trim()
    ? all.filter(x => norm(x.label).includes(norm(q)) || (x.sub && norm(x.sub).includes(norm(q))))
    : all.slice(0, 8);

  const pick = (item) => { onClose(); router.push(item.href); };

  const GROUPS = [
    { kind: 'note',   label: '메뉴개발 노트' },
    { kind: 'menu',   label: '메뉴' },
    { kind: 'action', label: '빠른 작업' },
  ];

  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          <Icon.search style={{width:18, height:18, color:'var(--text-3)'}} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length) pick(filtered[0]);
            }}
            placeholder="메뉴, 재료, 보고서, 노트 검색" />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-results">
          {filtered.length === 0 ? (
            <div className="palette-empty">검색 결과 없음</div>
          ) : (
            GROUPS.map(({ kind, label }) => {
              const rows = filtered.filter(x => x.kind === kind);
              if (!rows.length) return null;
              return (
                <div key={kind}>
                  <div className="palette-group">{label}</div>
                  {rows.map((r) => (
                    <button key={r.href + r.label} className="palette-row" onClick={() => pick(r)}>
                      <div className="palette-row-ico" style={{
                        background: kind === 'note'   ? 'var(--warn-soft)'
                                  : kind === 'menu'   ? 'var(--accent-soft)'
                                  : 'var(--positive-soft)',
                        color:      kind === 'note'   ? 'var(--warn)'
                                  : kind === 'menu'   ? 'var(--accent-text)'
                                  : 'var(--positive)',
                        fontSize: 13,
                      }}>
                        {kind === 'note'   ? (STATUS_ICON[r.status] || '📝')
                         : kind === 'menu' ? <Icon.chevRight style={{width:14,height:14}}/>
                         : <Icon.plus style={{width:14,height:14}}/>}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <span className="palette-row-label">{r.label}</span>
                        {r.sub && (
                          <span style={{display:'block', fontSize:11, color:'var(--text-3)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{r.sub}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
        <div className="palette-foot">
          <span><kbd>↑↓</kbd> 이동</span>
          <span><kbd>↵</kbd> 선택</span>
          <span><kbd>esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
