'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

const GROUPS = [
  {
    label: '영양성분',
    items: [
      { href: '/nutrition/menu',     icon: 'doc',      title: '메뉴 영양성분', sub: '메뉴별 영양성분 데이터를 관리합니다' },
    ],
  },
  {
    label: '표시 정보',
    items: [
      { href: '/nutrition/allergen', icon: 'alert',    title: '알레르기 정보', sub: '메뉴별 알레르기 항목을 확인합니다' },
      { href: '/nutrition/origin',   icon: 'tag',      title: '원산지 정보',   sub: '식자재 원산지 정보를 관리합니다' },
    ],
  },
  {
    label: '출력',
    items: [
      { href: '/nutrition/export',   icon: 'download', title: '출력·내보내기', sub: '영양성분·원산지·알레르기 표를 출력합니다' },
    ],
  },
];

const ICO_COLORS = {
  doc:      { bg: 'var(--accent-soft)',   color: 'var(--accent-text)' },
  alert:    { bg: 'var(--warn-soft)',      color: 'var(--warn)' },
  tag:      { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  download: { bg: '#F0EBFF',             color: '#6B3FCB' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분·원산지']}
        title="영양성분·원산지"
        sub="메뉴별 영양성분, 알레르기, 원산지 정보를 관리하고 출력하세요."
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
