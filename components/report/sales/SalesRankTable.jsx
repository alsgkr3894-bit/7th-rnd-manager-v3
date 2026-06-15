'use client';
import { SalesRankItemRows } from './SalesRankTableRows';

export function SalesRankTable({ items, opts }) {
  return (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>메뉴명 (중분류)</th>
          <th style={{ width: 90, textAlign: 'right' }}>판매량</th>
          {opts.prevComp && <th style={{ width: 80, textAlign: 'right' }}>전월</th>}
          {opts.prevComp && <th style={{ width: 80, textAlign: 'right' }}>증감</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <SalesRankItemRows key={item.name} item={item} index={index} opts={opts} />
        ))}
      </tbody>
    </table>
  );
}
