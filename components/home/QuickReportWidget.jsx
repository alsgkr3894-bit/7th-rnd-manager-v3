'use client';
import { Icon } from '@/components/icons';

const REPORT_LINKS = [
  { href: '/report/sales', icon: 'chart', label: '판매량', sub: '메뉴별 판매 현황' },
  { href: '/report/shipment', icon: 'box', label: '출고량', sub: '제때 상품 출고' },
  { href: '/report/cost', icon: 'calc', label: '원가계산', sub: '원가율·마진 분석' },
  { href: '/report/price', icon: 'tag', label: '가격 비교', sub: '제때 단가 비교' },
];

export function QuickReportWidget({ router }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">보고서 빠른 생성</div>
          <div className="card-sub">보고서 유형을 선택해 바로 시작하세요</div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/report')}>
          전체 →
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {REPORT_LINKS.map(({ href, icon, label, sub }) => {
          const IconComp = Icon[icon];
          return (
            <button
              key={href}
              onClick={() => router?.push?.(href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 13px',
                borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={event => {
                event.currentTarget.style.background = 'var(--accent-soft)';
                event.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.background = 'var(--surface-2)';
                event.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {IconComp && <IconComp style={{ width: 15, height: 15 }} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
