'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  COST_COMMON_EDGES_ROUTE,
  COST_COMMON_GROUPS_ROUTE,
  COST_MARGIN_ROUTE,
  MENU_MASTER_ROUTE,
} from '@/lib/cost/routes';

const GROUPS = [
  {
    label: '기초 데이터',
    items: [
      {
        href: '/ingredient/manage?view=price',
        icon: 'tag',
        title: '식자재 가격',
        sub: '재료별 단가·공급업체 관리',
      },
      {
        href: MENU_MASTER_ROUTE,
        icon: 'doc',
        title: '메뉴 마스터',
        sub: '메뉴·판매가·레시피 기준',
      },
      {
        href: COST_COMMON_GROUPS_ROUTE,
        icon: 'box',
        title: '공통묶음 관리',
        sub: '공통 재료 묶음·메뉴별 선택 후보',
      },
      {
        href: COST_COMMON_EDGES_ROUTE,
        icon: 'box',
        title: '엣지 원가 관리',
        sub: '엣지·도우 항목별 원가',
      },
    ],
  },
  {
    label: '원가 분석',
    items: [
      {
        href: COST_MARGIN_ROUTE,
        icon: 'chart',
        title: '원가마진표',
        sub: '원가율·마진율·플랫폼 시뮬레이션',
      },
      {
        href: '/cost/all-summary',
        icon: 'chart',
        title: '전체 종합 원가표',
        sub: '모든 카테고리 통합 원가 현황',
      },
    ],
  },
];

const ICO_COLORS = {
  tag: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  doc: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  download: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  chart: { bg: '#F0EBFF', color: '#6B3FCB' },
  box: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산']}
        title="원가계산"
        sub="식자재 가격·공통 원가·원가율을 관리하세요."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {GROUPS.map(g => (
          <div key={g.label}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-4)',
                letterSpacing: 0,
                textTransform: 'uppercase',
                paddingLeft: 2,
                marginBottom: 10,
              }}
            >
              {g.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                gap: 12,
              }}
            >
              {g.items.map(item => {
                const IcoEl = Icon[item.icon] || Icon.doc;
                const { bg, color } = ICO_COLORS[item.icon] || ICO_COLORS.doc;
                return (
                  <button
                    key={item.href}
                    className="card card-lift"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 18px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                    onClick={() => router.push(item.href)}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        flexShrink: 0,
                        background: bg,
                        color,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <IcoEl style={{ width: 18, height: 18 }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontWeight: 700,
                          fontSize: 14,
                          color: 'var(--text-1)',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          color: 'var(--text-3)',
                          marginTop: 2,
                        }}
                      >
                        {item.sub}
                      </span>
                    </span>
                    <Icon.chevRight
                      style={{ width: 14, height: 14, color: 'var(--text-4)', flexShrink: 0 }}
                    />
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
