'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function AllergenSummaryPanel({ totalWithAllergen, totalIngredients, matchedMenuCount }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="알레르기 등록 식자재" value={totalWithAllergen} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard label="알레르기 매칭 메뉴" value={matchedMenuCount} />
      </div>

      <div className="card" style={{ marginTop: 16, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
          한국 법정 알레르기 22종
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALLERGEN_SEED.map(al => (
            <span
              key={asDisplayText(al.allergenCode)}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
              }}
            >
              {asDisplayText(al.allergenName)}
            </span>
          ))}
        </div>
      </div>

      {totalWithAllergen === 0 && (
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
          알레르기 등록 식자재 없음 —{' '}
          <Link href="/ingredient/manage" style={{ color: 'inherit', textDecoration: 'underline' }}>
            식자재 관리에서 입력
          </Link>
        </div>
      )}
    </>
  );
}
