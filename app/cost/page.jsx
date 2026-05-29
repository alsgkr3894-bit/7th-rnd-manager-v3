'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

const GROUPS = [
  {
    label: '기초 데이터',
    items: [
      { href: '/cost/ingredient-price', icon: 'tag',      title: '식자재 가격',  sub: '재료별 단가·공급업체 관리' },
      { href: '/cost/recipe',  icon: 'doc', title: '레시피',   sub: '메뉴별 사용 재료·배합 비율' },
      { href: '/cost/manage',  icon: 'box', title: '공통 관리', sub: '공통묶음 · 엣지 원가 관리' },
      { href: '/cost/menu-price',       icon: 'download', title: '메뉴 가격표',  sub: '판매가·목표 원가율 설정' },
      { href: '/cost/margin',           icon: 'chart',    title: '원가마진표',     sub: '원가율·마진율·플랫폼 시뮬레이션' },
    ],
  },
  {
    label: '피자 원가',
    items: [
      { href: '/cost/pizza',      icon: 'box', title: '피자 원가표',    sub: '레시피 구성 · 세부 · 종합 원가' },
      { href: '/cost/edge-dough', icon: 'doc', title: '엣지·도우 원가', sub: '엣지·도우 항목별 원가' },
    ],
  },
  {
    label: '사이드 & 1인피자',
    items: [
      { href: '/cost/side',     icon: 'box', title: '사이드 원가표',  sub: '레시피 구성 · 세부 · 종합 원가' },
      { href: '/cost/personal', icon: 'box', title: '1인피자 원가표', sub: '레시피 구성 · 세부 · 종합 원가' },
    ],
  },
  {
    label: '세트 원가',
    items: [
      { href: '/cost/set', icon: 'box', title: '세트 원가표', sub: '레시피 구성 · 세부 · 종합 원가' },
    ],
  },
  {
    label: '전체 종합',
    items: [
      { href: '/cost/all-summary', icon: 'chart', title: '전체 종합 원가표', sub: '모든 카테고리 통합 원가 현황' },
    ],
  },
];

const ICO_COLORS = {
  tag:      { bg: 'var(--positive-soft)',  color: 'var(--positive)' },
  doc:      { bg: 'var(--accent-soft)',    color: 'var(--accent-text)' },
  download: { bg: 'var(--warn-soft)',      color: 'var(--warn)' },
  chart:    { bg: '#F0EBFF',              color: '#6B3FCB' },
  box:      { bg: 'var(--surface-2)',      color: 'var(--text-2)' },
};

export default function Page() {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산']}
        title="원가계산"
        sub="식자재 가격·레시피·원가율을 관리하고 카테고리별 원가표를 확인하세요."
      />

      <div style={{display:'flex',flexDirection:'column',gap:24}}>
        {GROUPS.map(g => (
          <div key={g.label}>
            <div style={{
              fontSize:11,fontWeight:700,color:'var(--text-4)',
              letterSpacing:'0.06em',textTransform:'uppercase',
              paddingLeft:2,marginBottom:10,
            }}>{g.label}</div>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',
              gap:12,
            }}>
              {g.items.map(item => {
                const IcoEl = Icon[item.icon] || Icon.doc;
                const { bg, color } = ICO_COLORS[item.icon] || ICO_COLORS.doc;
                return (
                  <button
                    key={item.href}
                    className="card card-lift"
                    style={{
                      display:'flex',alignItems:'center',gap:14,
                      padding:'16px 18px',textAlign:'left',cursor:'pointer',
                      border:'1px solid var(--border)',background:'var(--surface)',
                    }}
                    onClick={() => router.push(item.href)}
                  >
                    <span style={{
                      width:40,height:40,borderRadius:12,flexShrink:0,
                      background:bg,color,display:'grid',placeItems:'center',
                    }}>
                      <IcoEl style={{width:18,height:18}}/>
                    </span>
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{display:'block',fontWeight:700,fontSize:14,color:'var(--text-1)'}}>{item.title}</span>
                      <span style={{display:'block',fontSize:12,color:'var(--text-3)',marginTop:2}}>{item.sub}</span>
                    </span>
                    <Icon.chevRight style={{width:14,height:14,color:'var(--text-4)',flexShrink:0}}/>
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
