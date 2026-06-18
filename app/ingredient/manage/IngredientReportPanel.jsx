'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { getPrimaryIngredientPhoto } from '@/lib/ingredient/photos';
import {
  printIngredientManageReport,
  printIngredientPhotoReport,
} from '@/lib/ingredient/manage-print';

function ModeButton({ active, onClick, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '11px 14px',
        border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 8,
        background: active ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: active ? 'var(--accent)' : 'var(--text-1)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{desc}</div>
    </button>
  );
}

function TablePreview() {
  const cols = [16, 36, 68, 36, 30, 36, 52, 22];
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {cols.map((w, i) => (
          <div
            key={i}
            style={{ background: '#e5e7eb', height: 9, width: w, borderRadius: 2, flexShrink: 0 }}
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5].map(r => (
        <div key={r} style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
          {cols.map((w, i) => (
            <div
              key={i}
              style={{
                background: '#f9fafb',
                height: 7,
                width: w,
                borderRadius: 2,
                border: '1px solid #f0f0f0',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PhotoCardPreview() {
  return (
    <div
      style={{
        background: '#f5f5f5',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 8,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 7,
      }}
    >
      {[0, 1].map(i => (
        <div
          key={i}
          style={{
            background: '#fff',
            border: '1.5px solid #ccc',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              padding: 5,
              background: '#f0f0f0',
            }}
          >
            {[0, 1].map(j => (
              <div
                key={j}
                style={{
                  background: '#c8c8c8',
                  height: 44,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: 14, height: 11, background: '#a0a0a0', borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ padding: '5px 7px' }}>
            <div
              style={{
                background: '#1a1a1a',
                height: 8,
                borderRadius: 2,
                marginBottom: 5,
                width: '65%',
              }}
            />
            {[80, 90, 75, 85].map((pct, k) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 3,
                  alignItems: 'center',
                }}
              >
                <div style={{ background: '#d1d5db', height: 5, width: 28, borderRadius: 2 }} />
                <div
                  style={{
                    background: '#e5e7eb',
                    height: 5,
                    width: pct * 0.6,
                    borderRadius: 2,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IngredientReportPanel({
  filtered,
  rows,
  catFilter,
  tagFilter,
  search,
  managedCount,
  priceDate,
}) {
  const [mode, setMode] = useState('table');

  const hasPhotos = filtered.some(row => getPrimaryIngredientPhoto(row));

  function handlePrint() {
    const opts = {
      filters: { category: catFilter, tag: tagFilter, search },
      managedCount,
      priceDate,
      totalCount: rows.length,
    };
    if (mode === 'photo') {
      printIngredientPhotoReport(filtered, opts);
    } else {
      printIngredientManageReport(filtered, opts);
    }
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <div
        className="card"
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>식자재 리스트 출력</div>

        {/* 출력 형식 선택 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            출력 형식
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ModeButton
              active={mode === 'table'}
              onClick={() => setMode('table')}
              label="현재 상태 출력"
              desc="목록 표 형식 · 다수 항목"
            />
            <ModeButton
              active={mode === 'photo'}
              onClick={() => setMode('photo')}
              label="사진 카드 출력"
              desc={`페이지당 2개 · 포장/상세정보 사진${!hasPhotos ? ' · 사진 없음' : ''}`}
            />
          </div>
        </div>

        {/* 미리보기 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            미리보기
          </div>
          {mode === 'table' ? <TablePreview /> : <PhotoCardPreview />}
        </div>

        {/* 출력 정보 + 버튼 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            현재 필터 기준 <b style={{ color: 'var(--text-1)' }}>{filtered.length}개</b> / 전체{' '}
            {rows.length}개
          </div>
          <button className="btn primary" onClick={handlePrint} disabled={filtered.length === 0}>
            <Icon.doc style={{ width: 14, height: 14 }} /> PDF 출력
          </button>
        </div>
      </div>
    </div>
  );
}
