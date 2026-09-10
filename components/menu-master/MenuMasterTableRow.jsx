'use client';

import { Icon } from '@/components/icons';
import { CategoryTags } from '@/components/menu-master/MenuCategoryTags';
import { MenuRecipeCostCell } from '@/components/menu-master/MenuRecipeCostCell';
import { getMenuSubCategoryFromCode } from '@/lib/cost/menu-price';
import { isMenuNutritionLinked } from '@/lib/menu-master/readiness';

const STATUS_LABEL = { active: '활성', discontinued: '단종', test: '테스트' };
const STATUS_STYLE = {
  active: { background: 'var(--positive-soft)', color: 'var(--positive)' },
  discontinued: { background: 'var(--surface-2)', color: 'var(--text-3)' },
  test: { background: 'var(--accent-soft)', color: 'var(--accent)' },
};

export function MenuMasterTableRow({
  row,
  recipeSummary,
  isViewer,
  onEdit,
  onDelete,
  nutritionLinkedCodes,
}) {
  const subMeta = getMenuSubCategoryFromCode(row.menuCode);
  const subLabel = subMeta
    ? `${subMeta.code} ${subMeta.label}`
    : row.subCategory || <span style={{ color: 'var(--text-4)' }}>-</span>;
  const nutritionLinked = isMenuNutritionLinked(row, nutritionLinkedCodes);

  return (
    <tr
      style={{
        opacity: row.status === 'discontinued' ? 0.5 : 1,
        cursor: isViewer ? 'default' : 'pointer',
      }}
      onClick={isViewer ? undefined : () => onEdit(row)}
      title={isViewer ? undefined : '클릭하여 수정'}
    >
      <td
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent-text)',
          letterSpacing: '.5px',
        }}
      >
        {row.menuCode}
      </td>
      <td className="cell-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {row.photo?.data && (
          <img
            src={row.photo.data}
            alt=""
            style={{
              width: 24,
              height: 24,
              objectFit: 'cover',
              borderRadius: 5,
              flexShrink: 0,
              border: '1px solid var(--border)',
            }}
          />
        )}
        {isViewer ? (
          <div className="menu-name">
            {row.menuName}
            {row.excludeFromOrigin && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--warn-soft)',
                  color: 'var(--warn)',
                }}
              >
                원산지제외
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="menu-name"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
              flex: 1,
              minWidth: 0,
              font: 'inherit',
              color: 'inherit',
            }}
            onClick={e => {
              e.stopPropagation();
              onEdit(row);
            }}
            title="클릭하여 수정"
          >
            {row.menuName}
            {row.excludeFromOrigin && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--warn-soft)',
                  color: 'var(--warn)',
                }}
              >
                원산지제외
              </span>
            )}
          </button>
        )}
      </td>
      <td>
        <CategoryTags menuCode={row.menuCode} />
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{subLabel}</td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {row.size || <span style={{ color: 'var(--text-4)' }}>단일</span>}
      </td>
      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
        {row.price != null ? (
          <span>
            {row.price.toLocaleString()}
            <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 2 }}>원</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>—</span>
        )}
      </td>
      <td>
        <MenuRecipeCostCell summary={recipeSummary} />
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              ...STATUS_STYLE[row.status],
            }}
          >
            {STATUS_LABEL[row.status] || row.status}
          </span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              ...(nutritionLinked
                ? { background: 'var(--positive-soft)', color: 'var(--positive)' }
                : { background: 'var(--warn-soft)', color: 'var(--warn)' }),
            }}
            title={nutritionLinked ? '영양성분 데이터 연동됨' : '영양성분 데이터 미입력'}
          >
            영양 {nutritionLinked ? '연동' : '누락'}
          </span>
        </div>
      </td>
      <td
        style={{
          textAlign: 'right',
          display: 'flex',
          gap: 4,
          justifyContent: 'flex-end',
        }}
      >
        <button
          className="btn sm ghost"
          onClick={e => {
            e.stopPropagation();
            onEdit(row);
          }}
          disabled={isViewer}
        >
          <Icon.edit style={{ width: 13, height: 13 }} />
        </button>
        <button
          className="btn sm ghost"
          onClick={e => {
            e.stopPropagation();
            onDelete(row);
          }}
          style={{ color: 'var(--negative)' }}
          title="삭제"
          disabled={isViewer}
        >
          <Icon.trash style={{ width: 13, height: 13 }} />
        </button>
      </td>
    </tr>
  );
}
