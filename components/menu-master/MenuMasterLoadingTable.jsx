'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function MenuMasterLoadingTable() {
  return (
    <div className="card table-card">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 145 }}>메뉴코드</th>
              <th>메뉴명</th>
              <th style={{ width: 200 }}>분류 태그</th>
              <th style={{ width: 60 }}>사이즈</th>
              <th style={{ width: 100 }}>판매가</th>
              <th style={{ width: 120 }}>레시피/원가</th>
              <th style={{ width: 80 }}>상태</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <Skeleton width={100} height={13} />
                </td>
                <td>
                  <Skeleton width="80%" height={13} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Skeleton width={44} height={20} radius={999} />
                    <Skeleton width={72} height={20} radius={999} />
                  </div>
                </td>
                <td>
                  <Skeleton width={32} height={13} />
                </td>
                <td>
                  <Skeleton width={60} height={13} style={{ marginLeft: 'auto' }} />
                </td>
                <td>
                  <Skeleton width={70} height={20} radius={6} />
                </td>
                <td>
                  <Skeleton width={44} height={20} radius={6} />
                </td>
                <td>
                  <Skeleton width={28} height={28} radius={6} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
