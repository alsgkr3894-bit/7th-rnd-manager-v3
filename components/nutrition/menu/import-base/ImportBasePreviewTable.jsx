'use client';
import { ImportBaseRow } from './ImportBaseRow';

const previewHeaderStyle = {
  padding: '9px 10px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 12,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
  color: 'var(--text-2)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
};

export function ImportBasePreviewTable({ rows, menuMasters, onToggle, onUpdate }) {
  return (
    <div
      style={{
        maxHeight: '62vh',
        overflow: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 14,
      }}
    >
      <table style={{ minWidth: 1380, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...previewHeaderStyle, minWidth: 210 }}>원본명</th>
            <th style={{ ...previewHeaderStyle, minWidth: 360 }}>메뉴 매칭</th>
            <th style={{ ...previewHeaderStyle, minWidth: 100 }}>크러스트</th>
            <th style={{ ...previewHeaderStyle, minWidth: 100 }}>카테고리</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>중량</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>열량</th>
            <th style={{ ...previewHeaderStyle, minWidth: 80 }}>당류</th>
            <th style={{ ...previewHeaderStyle, minWidth: 80 }}>단백질</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>포화지방</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>나트륨</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>상태</th>
            <th style={{ ...previewHeaderStyle, textAlign: 'center', minWidth: 70 }}>포함</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <ImportBaseRow
              key={idx}
              row={row}
              idx={idx}
              menuMasters={menuMasters}
              onToggle={onToggle}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
