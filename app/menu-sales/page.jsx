'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

const GROUPS = [
  {
    label: '데이터 입력',
    items: [
      { href: '/menu-sales/upload',       icon: 'upload', title: '파일 업로드',   sub: '메뉴 판매량 파일을 업로드합니다' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/menu-sales/rank-compare', icon: 'chart',  title: '순위 및 비교',  sub: '메뉴별 판매량 순위와 전월 비교' },
      { href: '/menu-sales/compare',      icon: 'chart',  title: '기간 비교',     sub: '기간별 메뉴 판매량을 비교합니다' },
      { href: '/menu-sales/rank',         icon: 'chart',  title: '판매 순위표',   sub: '메뉴 판매 순위를 확인합니다' },
    ],
  },
  {
    label: '관리',
    items: [
      { href: '/menu-sales/unmatched',    icon: 'alert',  title: '미매칭 관리',   sub: '매칭되지 않은 메뉴를 관리합니다' },
      { href: '/menu-sales/settings',     icon: 'gear',   title: '설정',         sub: '분류 규칙 및 메뉴 설정을 관리합니다' },
    ],
  },
];

const ICO_COLORS = {
  upload: { bg: 'var(--positive-soft)',  color: 'var(--positive)' },
  chart:  { bg: '#F0EBFF',              color: '#6B3FCB' },
  alert:  { bg: 'var(--warn-soft)',      color: 'var(--warn)' },
  gear:   { bg: 'var(--surface-2)',      color: 'var(--text-2)' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량']}
        title="메뉴 판매량"
        sub="판매 데이터를 업로드하고 메뉴별 순위·비교·미매칭 관리를 수행하세요."
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
                const { bg, color } = ICO_COLORS[item.icon] || ICO_COLORS.gear;
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
