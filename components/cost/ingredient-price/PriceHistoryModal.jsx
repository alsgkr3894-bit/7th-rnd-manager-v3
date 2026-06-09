'use client';
import { useState, useEffect } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { formatNumber, formatDate, formatRelative } from '@/lib/format';
import { getHistoryByIngredient } from '@/lib/cost/price-history';

const SOURCE_LABEL = {
  register: '직접 등록',
  bulk: '일괄 업로드',
  edit: '직접 수정',
};

function PriceArrow({ oldPrice, newPrice }) {
  const up = newPrice > (oldPrice ?? 0);
  const color = up ? 'var(--negative, #ef4444)' : 'var(--positive, #10b981)';
  const sign = up ? '+' : '';

  const diff = oldPrice != null ? newPrice - oldPrice : null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
        {oldPrice != null ? `${formatNumber(oldPrice)}원` : '—'}
      </span>
      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>→</span>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{formatNumber(newPrice)}원</span>
      {diff != null && (
        <span style={{ fontSize: 11, color, fontWeight: 500 }}>
          ({sign}
          {formatNumber(diff)}원)
        </span>
      )}
    </span>
  );
}

export function PriceHistoryModal({ ingredientId, ingredientName, onClose }) {
  const [history, setHistory] = useState(null); // null = 로딩 중

  useEffect(() => {
    let ignore = false;

    setHistory(null);
    if (ingredientId == null) {
      setHistory([]);
      return () => {
        ignore = true;
      };
    }

    getHistoryByIngredient(ingredientId)
      .then(rows => {
        if (!ignore) setHistory(rows);
      })
      .catch(() => {
        if (!ignore) setHistory([]);
      });

    return () => {
      ignore = true;
    };
  }, [ingredientId]);

  const subtitle = (
    <span>
      식자재: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{ingredientName}</span>
    </span>
  );

  return (
    <ModalFrame
      title="단가 변경 이력"
      subtitle={subtitle}
      onClose={onClose}
      width="min(560px, 95vw)"
      zIndex={350}
      padding="22px 24px"
    >
      {history === null ? (
        <div
          style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}
        >
          불러오는 중…
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          변경 이력이 없습니다.
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {history.map((h, i) => (
            <li
              key={h.id ?? i}
              style={{
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <PriceArrow oldPrice={h.oldPrice} newPrice={h.newPrice} />
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--surface-3)',
                    color: 'var(--text-3)',
                    flexShrink: 0,
                  }}
                >
                  {SOURCE_LABEL[h.source] ?? h.source}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {formatDate(h.changedAt)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
                  ({formatRelative(h.changedAt)})
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalFrame>
  );
}
