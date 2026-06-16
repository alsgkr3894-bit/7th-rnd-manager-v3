import { SortableTh } from '@/components/ui/SortableTh';

export function IngredientUsageTableHeader({ sortKey, sortDir, onSort }) {
  return (
    <thead>
      <tr>
        <th style={{ width: 36 }}>순위</th>
        <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={onSort}>
          식자재명
        </SortableTh>
        <SortableTh sortKey="count" active={sortKey} dir={sortDir} onClick={onSort} width={96}>
          사용 메뉴수
        </SortableTh>
        <th style={{ width: 112, textAlign: 'center' }}>피자/사이드</th>
        <th>메뉴 목록</th>
        <th style={{ width: 56 }}></th>
      </tr>
    </thead>
  );
}
