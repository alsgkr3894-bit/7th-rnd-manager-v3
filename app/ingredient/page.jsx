'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

const GROUPS = [
  {
    label: '식자재 관리',
    items: [
      { href: '/ingredient/list',   icon: 'tag',  title: '식자재 목록', sub: '등록된 식자재 전체 목록을 조회합니다' },
      { href: '/ingredient/manage', icon: 'edit', title: '식자재 관리', sub: '식자재 추가·수정·삭제를 수행합니다' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/ingredient/usage',  icon: 'chart', title: '사용량 분석', sub: '레시피별 식자재 사용 현황을 확인합니다' },
    ],
  },
];

const ICO_COLORS = {
  tag:   { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  edit:  { bg: 'var(--accent-soft)',   color: 'var(--accent-text)' },
  chart: { bg: '#F0EBFF',             color: '#6B3FCB' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재']}
        title="식자재"
        sub="식자재 목록을 관리하고 레시피 사용량을 분석하세요."
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
