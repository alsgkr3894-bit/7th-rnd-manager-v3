import { PageHeader } from '@/components/ui/PageHeader';

export function AllSummaryError({ dbError }) {
  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['원가계산', '종합전메뉴원가']}
        title="종합전메뉴원가"
        sub="로드 실패"
      />
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );
}
