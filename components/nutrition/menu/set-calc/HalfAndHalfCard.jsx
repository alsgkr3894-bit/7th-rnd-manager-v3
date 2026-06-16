import { THIN_CRUST_LABEL } from '@/lib/nutrition/crust-config';
import { formatKcal, formatKcalRange } from './format';

const CARD_TITLE_STYLE = { fontSize: 14, fontWeight: 700 };

export function HalfAndHalfCard({ pizzaMenus, halfResult }) {
  const variants = Array.isArray(halfResult?.variants) ? halfResult.variants : [];

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={CARD_TITLE_STYLE}>하프앤하프</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {`모든 피자 한판 총열량(kcal×총중량÷100) — 석쇠·치즈크러스트·${THIN_CRUST_LABEL}·골드스윗 L/R 후보 기준`}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-4)',
            padding: '3px 8px',
            background: 'var(--surface-2)',
            borderRadius: 6,
          }}
        >
          자동 계산 · 한판 총열량 기준
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <KcalCard
          label="피자 메뉴 수"
          value={`${pizzaMenus.length}개`}
          sub={`${variants.length}개 후보`}
        />
        <KcalCard
          label="L 하프앤하프"
          value={formatKcalRange(halfResult?.bySide?.L)}
          sub="L 후보 최저/최고 2종 반반"
          accent
        />
        <KcalCard
          label="R 하프앤하프"
          value={formatKcalRange(halfResult?.bySide?.R)}
          sub="R 후보 최저/최고 2종 반반"
          accent
        />
      </div>
      {pizzaMenus.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6 }}>
            피자 후보 총열량 높은순 — 최고 2개 / 최저 2개 색상 표시
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 4,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {variants.map((variant, index) => {
              const high = variant.highRank;
              const low = variant.lowRank;
              return (
                <div
                  key={`${variant.menuCode}-${variant.crustType}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    background: high ? '#FEE2E2' : low ? '#DCFCE7' : 'var(--surface-2)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: high ? '#991B1B' : low ? '#166534' : 'var(--text-2)',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {index + 1}. {variant.menuName} · {variant.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      marginLeft: 8,
                      flexShrink: 0,
                    }}
                  >
                    {formatKcal(variant.kcal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {pizzaMenus.length === 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: 'var(--text-4)',
            textAlign: 'center',
            padding: '12px 0',
          }}
        >
          베이스 영양성분(피자)을 먼저 입력해주세요
        </div>
      )}
    </div>
  );
}

function KcalCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: accent ? 'var(--accent-text)' : 'var(--text-1)',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
