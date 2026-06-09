'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

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
  const safeGroups = asObjectArray(groups);

  return (
    <main className="main">
      <PageHeader breadcrumb={breadcrumb} title={title} sub={sub} />

      {children && <div style={{ marginBottom: 24 }}>{children}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {safeGroups.map((g, groupIndex) => {
          const groupLabel = asDisplayText(g.label);
          return (
            <div key={`${groupLabel || 'group'}-${groupIndex}`}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-4)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  paddingLeft: 2,
                  marginBottom: 10,
                }}
              >
                {groupLabel}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {asObjectArray(g.items).map((item, itemIndex) => {
                  const iconKey = asDisplayText(item.icon);
                  const IcoEl = Icon[iconKey] || Icon.doc;
                  const href = typeof item.href === 'string' ? item.href : '';
                  const itemTitle = asDisplayText(item.title);
                  const itemSub = asDisplayText(item.sub);
                  return (
                    <button
                      key={href || `${itemTitle || 'item'}-${itemIndex}`}
                      className="card card-lift"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '16px 18px',
                        textAlign: 'left',
                        cursor: href ? 'pointer' : 'default',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        opacity: href ? 1 : 0.6,
                      }}
                      disabled={!href}
                      onClick={() => href && router.push(href)}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: asDisplayText(item.iconBg) || undefined,
                          color: asDisplayText(item.iconColor) || undefined,
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
                          {itemTitle}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 12,
                            color: 'var(--text-3)',
                            marginTop: 2,
                          }}
                        >
                          {itemSub}
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
          );
        })}
      </div>
    </main>
  );
}
