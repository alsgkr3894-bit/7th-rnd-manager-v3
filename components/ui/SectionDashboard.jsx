'use client';
import { SmallStatCard } from '@/components/ui/SmallStatCard';

/**
 * SectionDashboard — 섹션 상위 페이지(SectionHubPage) 상단의 미니 대시보드.
 *
 * 요약 KPI를 stat 카드 그리드로 보여준다. 로딩 시 스켈레톤, 데이터 없으면 안내.
 * 추가 위젯(순위 카드 등)은 children으로 받아 카드 그리드 아래에 렌더.
 *
 * @param {boolean}  props.loading - 로딩 중 여부
 * @param {Array<{label, value, unit?, valueColor?}>} props.cards - stat 카드 목록
 * @param {string}   [props.emptyHint] - 데이터 없을 때 안내 문구 (없으면 미표시)
 * @param {boolean}  [props.isEmpty]   - 데이터 없음 상태
 * @param {ReactNode}[props.children]  - 카드 그리드 아래 추가 영역
 */
export function SectionDashboard({ loading, cards = [], emptyHint, isEmpty, children }) {
  if (loading) {
    return (
      <div style={GRID}>
        {Array.from({ length: Math.max(cards.length, 4) }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return emptyHint ? (
      <div className="card" style={{ padding: '16px 20px', color: 'var(--text-3)', fontSize: 13 }}>
        {emptyHint}
      </div>
    ) : null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={GRID}>
        {cards.map(c => (
          <SmallStatCard key={c.label} label={c.label} value={c.value} unit={c.unit} valueColor={c.valueColor} />
        ))}
      </div>
      {children}
    </div>
  );
}

const GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};
