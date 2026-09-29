/**
 * 홈 대시보드 데이터가 도착하기 전 자리표시자 — 위젯이 조금씩 끼어들며 아래 내용을 밀어내는
 * 레이아웃 시프트(CLS)를 막기 위해, 고정 높이 블록 하나로 자리를 잡아 두었다가 한 번에 교체한다.
 * 애니메이션은 일부러 없다(합성되지 않는 애니메이션 회피).
 */
export function HomeDashboardSkeleton() {
  return (
    <div className="home-skeleton" role="status" aria-busy="true" aria-label="대시보드 불러오는 중">
      <div className="home-skeleton-row">
        <span className="home-skeleton-card" />
        <span className="home-skeleton-card" />
        <span className="home-skeleton-card" />
      </div>
      <span className="home-skeleton-card home-skeleton-wide" />
    </div>
  );
}
