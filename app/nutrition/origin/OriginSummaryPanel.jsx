import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SmallStatCard } from '@/components/ui/SmallStatCard';

const actionLinkStyle = {
  color: 'inherit',
  textDecoration: 'underline',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 24,
};

export function OriginSummaryPanel({
  totalWithOrigin,
  totalIngredients,
  withoutOrigin,
  menuCount,
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="원산지 등록 식자재" value={totalWithOrigin} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard
          label="미등록"
          value={withoutOrigin}
          valueColor={withoutOrigin > 0 ? 'var(--warn)' : undefined}
        />
        <SmallStatCard label="매핑 메뉴 수" value={menuCount} />
      </div>

      {withoutOrigin > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0 }} />
          원산지 미등록 식자재 {withoutOrigin}개 —{' '}
          <Link href="/ingredient/manage" style={actionLinkStyle}>
            식자재 관리에서 입력
          </Link>
        </div>
      )}
    </>
  );
}
