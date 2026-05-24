'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

const ALL_ITEMS = [
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
  { kind: 'menu',   label: '노트 작성',                href: '/note/write' },
  { kind: 'menu',   label: '판매량 보고서',            href: '/report/sales' },
  { kind: 'menu',   label: '원가계산 보고서',          href: '/report/cost' },
  { kind: 'menu',   label: '시스템 설정',              href: '/settings/system' },
  { kind: 'menu',   label: '데이터 백업',              href: '/settings/backup' },
  { kind: 'action', label: '제때판매가 업로드',        href: '/menu-sales/upload' },
  { kind: 'action', label: '새 테스트 노트 작성',      href: '/note/write' },
  { kind: 'action', label: '데이터 백업 실행',         href: '/settings/backup' },
];

export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // notify parent to open — handled via AppShell
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const norm = s => s.toLowerCase().replace(/\s+/g, '');
  const filtered = q.trim() ? ALL_ITEMS.filter(x => norm(x.label).includes(norm(q))) : ALL_ITEMS.slice(0, 8);

  const pick = (item) => { onClose(); router.push(item.href); };

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
            ['menu', 'action'].map(group => {
              const rows = filtered.filter(x => x.kind === group);
              if (!rows.length) return null;
              return (
                <div key={group}>
                  <div className="palette-group">{group === 'menu' ? '메뉴' : '빠른 작업'}</div>
                  {rows.map((r) => (
                    <button key={r.href + r.label} className="palette-row" onClick={() => pick(r)}>
                      <div className="palette-row-ico" style={{
                        background: group === 'menu' ? 'var(--accent-soft)' : 'var(--positive-soft)',
                        color: group === 'menu' ? 'var(--accent-text)' : 'var(--positive)',
                      }}>
                        {group === 'menu'
                          ? <Icon.chevRight style={{width:14,height:14}}/>
                          : <Icon.plus style={{width:14,height:14}}/>}
                      </div>
                      <span className="palette-row-label">{r.label}</span>
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
