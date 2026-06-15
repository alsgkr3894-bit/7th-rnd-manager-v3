'use client';
import { SalesCategoryBarRow } from './SalesCategoryBarRow';

export function SalesCategoryBarRows({ items, catColor, catTotal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '10px 0 14px' }}>
      {items.map((item, index) => (
        <SalesCategoryBarRow
          key={item.name}
          item={item}
          index={index}
          itemCount={items.length}
          catColor={catColor}
          catTotal={catTotal}
        />
      ))}
    </div>
  );
}
