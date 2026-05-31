'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * SectionHubPage — 섹션 상위 허브 페이지 공통 컴포넌트.
 *
 * @param {string[]}  props.breadcrumb - 브레드크럼 경로
 * @param {string}    props.title      - 페이지 제목
 * @param {string}    props.sub        - 페이지 부제목
 * @param {Group[]}   props.groups     - 그룹 목록
 * @param {ReactNode} [props.children] - 대시보드 슬롯 (PageHeader 아래, 링크 카드 위에 렌더)
 *
 * Group: { label: string, items: Item[] }
 * Item:  { href, icon, title, sub, iconBg, iconColor }
 */
export function SectionHubPage({ breadcrumb, title, sub, groups, children }) {
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader breadcrumb={breadcrumb} title={title} sub={sub} />

      {children && <div style={{ marginBottom: 24 }}>{children}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.map(g => (
          <div key={g.label}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-4)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingLeft: 2, marginBottom: 10,
            }}>
              {g.label}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {g.items.map(item => {
                const IcoEl = Icon[item.icon] || Icon.doc;
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
                      background: item.iconBg, color: item.iconColor,
                      display: 'grid', placeItems: 'center',
                    }}>
                      <IcoEl style={{ width: 18, height: 18 }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                        {item.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {item.sub}
                      </span>
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
