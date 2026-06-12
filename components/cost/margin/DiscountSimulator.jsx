'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

/**
 * 할인 시뮬레이터 — Toggle 버튼과 Panel 폼으로 분리.
 *
 * 사용법:
 *   <DiscountSimulator.Toggle discOpen={} onDiscOpen={} discount={} />  ← platform bar 오른쪽
 *   <DiscountSimulator.Panel discOpen={} discType={} onDiscType={} discVal={} onDiscVal={} discount={} />
 */

function Toggle({ discOpen, onDiscOpen, discount }) {
  const handleOpen = typeof onDiscOpen === 'function' ? onDiscOpen : () => {};
  return (
    <button
      className={'btn sm' + (discOpen ? ' primary' : '')}
      onClick={() => handleOpen(o => !o)}
      style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
    >
      <Icon.calc style={{ width: 12, height: 12 }} />
      할인 시뮬레이터
      {discount && <span style={{ fontWeight: 700, marginLeft: 2 }}>ON</span>}
    </button>
  );
}

function Panel({ discOpen, discType, onDiscType, discVal, onDiscVal, discount }) {
  if (!discOpen) return null;
  const handleDiscType = typeof onDiscType === 'function' ? onDiscType : () => {};
  const handleDiscVal = typeof onDiscVal === 'function' ? onDiscVal : () => {};

  return (
    <div
      className="card"
      style={{
        padding: '10px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 6,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
        할인 적용
      </span>

      <div
        style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}
      >
        {['pct', 'fixed'].map(t => (
          <button
            key={t}
            onClick={() => {
              handleDiscType(t);
              handleDiscVal('');
            }}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              background: discType === t ? 'var(--accent)' : 'var(--surface-2)',
              color: discType === t ? '#fff' : 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            {t === 'pct' ? '% 할인' : '원 할인'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          className="form-input"
          type="number"
          value={discVal}
          onChange={e => handleDiscVal(e.target.value)}
          placeholder={discType === 'pct' ? '예) 20' : '예) 5000'}
          style={{ width: 90, textAlign: 'right' }}
          min="0"
          max={discType === 'pct' ? '100' : undefined}
        />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {discType === 'pct' ? '%' : '원'}
        </span>
      </div>

      {discount ? (
        <span
          style={{
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--surface-2)',
            padding: '3px 10px',
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          {discType === 'pct'
            ? `${discount.value}% 할인`
            : `${formatNumber(discount.value)}원 할인`}{' '}
          적용 중
        </span>
      ) : discVal ? (
        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>양수 값을 입력하세요</span>
      ) : null}

      <button
        className="btn sm"
        onClick={() => handleDiscVal('')}
        style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}
      >
        초기화
      </button>
    </div>
  );
}

export const DiscountSimulator = { Toggle, Panel };
