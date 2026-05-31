'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

const GROUPS = [
  {
    label: '가격 분석',
    items: [
      { href: '/jette/price-compare', icon: 'chart',    title: '가격 비교',   sub: '경쟁사·플랫폼 가격을 비교합니다' },
    ],
  },
  {
    label: '물류',
    items: [
      { href: '/jette/shipment',      icon: 'box',      title: '배송 현황',   sub: '배송 건수 및 현황을 확인합니다' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/jette/settings',      icon: 'gear',     title: '설정',       sub: '제트 관련 설정을 관리합니다' },
    ],
  },
];

const ICO_COLORS = {
  chart: { bg: '#F0EBFF',              color: '#6B3FCB' },
  box:   { bg: 'var(--surface-2)',      color: 'var(--text-2)' },
  gear:  { bg: 'var(--accent-soft)',    color: 'var(--accent-text)' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['제트']}
        title="제트"
        sub="가격 비교, 배송 현황, 설정을 한 곳에서 관리하세요."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {GROUPS.map(g => (
          <div key={g.label}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-4)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingLeft: 2, marginBottom: 10,
            }}>{g.label}</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
              gap: 12,
            }}>
              {g.items.map(item => {
                const IcoEl = Icon[item.icon] || Icon.doc;
                const { bg, color } = ICO_COLORS[item.icon] || { bg: 'var(--surface-2)', color: 'var(--text-2)' };
                return (
                  <button
                    key={item.href}
                    className="card card-lift"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', textAlign: 'left', cursor: 'pointer',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                    }}
                    onClick={() => router.push(item.href)}
                  >
                    <span style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: bg, color, display: 'grid', placeItems: 'center',
                    }}>
                      <IcoEl style={{ width: 18, height: 18 }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{item.title}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.sub}</span>
                    </span>
                    <Icon.chevRight style={{ width: 14, height: 14, color: 'var(--text-4)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
