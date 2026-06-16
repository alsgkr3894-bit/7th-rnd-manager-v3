import { Skeleton } from '@/components/ui/Skeleton';

const SKELETON_TABS = ['베이스', '엣지', '토핑', '파생', '결과', '세트'];

export function NutritionMenuSkeleton() {
  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginTop: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 1,
        }}
      >
        {SKELETON_TABS.map((_, index) => (
          <Skeleton key={index} width={110} height={34} radius={8} style={{ marginBottom: -1 }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
        <Skeleton width={200} height={32} radius={8} />
        <Skeleton width={120} height={32} radius={8} />
        <Skeleton width={88} height={32} radius={8} style={{ marginLeft: 'auto' }} />
      </div>

      <div className="card table-card" style={{ marginTop: 12 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {[145, null, 70, 70, 70, 70, 70, 70].map((width, index) => (
                  <th key={index} style={width ? { width } : undefined}>
                    <Skeleton width={width ? width * 0.6 : '60%'} height={11} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td>
                    <Skeleton width={100} height={13} />
                  </td>
                  <td>
                    <Skeleton width="75%" height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                  <td>
                    <Skeleton width={48} height={13} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
