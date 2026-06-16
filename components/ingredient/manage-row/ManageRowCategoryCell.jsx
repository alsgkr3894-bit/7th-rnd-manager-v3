import { getCategoryStyle } from '@/lib/ingredient';

export function ManageRowCategoryCell({ category }) {
  return (
    <td>
      {category ? (
        <span
          className="chip"
          style={{ ...getCategoryStyle(category), padding: '2px 8px', fontSize: 11 }}
        >
          {category}
        </span>
      ) : (
        <span
          className="chip"
          style={{
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            fontSize: 10,
            padding: '1px 6px',
          }}
        >
          미분류
        </span>
      )}
    </td>
  );
}
