import { SortableTh } from '@/components/ui/SortableTh';

export function ReportListTableHeader({ sortKey, sortDir, toggleSort }) {
  return (
    <thead>
      <tr>
        <th style={{ width: 36 }}></th>
        <SortableTh sortKey="id" active={sortKey} dir={sortDir} onClick={toggleSort} width={110}>
          보고서 ID
        </SortableTh>
        <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={toggleSort}>
          제목
        </SortableTh>
        <SortableTh sortKey="kind" active={sortKey} dir={sortDir} onClick={toggleSort} width={80}>
          유형
        </SortableTh>
        <th style={{ width: 150 }}>대상 기간</th>
        <th style={{ width: 100 }}>작성자</th>
        <SortableTh
          sortKey="createdAt"
          active={sortKey}
          dir={sortDir}
          onClick={toggleSort}
          width={140}
        >
          생성일시
        </SortableTh>
        <th style={{ width: 100 }}>활동</th>
        <th style={{ width: 250 }}></th>
      </tr>
    </thead>
  );
}
