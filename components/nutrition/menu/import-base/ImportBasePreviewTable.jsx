'use client';
import { ImportBaseRow } from './ImportBaseRow';

const previewHeaderStyle = {
  padding: '7px 8px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 11,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
};

export function ImportBasePreviewTable({ rows, menuMasters, onToggle, onUpdate }) {
  return (
    <div
      style={{
        maxHeight: '56vh',
        overflowY: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 14,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={previewHeaderStyle}>원본명</th>
            <th style={{ ...previewHeaderStyle, minWidth: 170 }}>메뉴 매칭</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>크러스트</th>
            <th style={{ ...previewHeaderStyle, minWidth: 90 }}>카테고리</th>
            <th style={previewHeaderStyle}>중량</th>
            <th style={previewHeaderStyle}>열량</th>
            <th style={previewHeaderStyle}>당류</th>
            <th style={previewHeaderStyle}>단백질</th>
            <th style={previewHeaderStyle}>포화지방</th>
            <th style={previewHeaderStyle}>나트륨</th>
            <th style={previewHeaderStyle}>상태</th>
            <th style={{ ...previewHeaderStyle, textAlign: 'center' }}>포함</th>
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
