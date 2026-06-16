'use client';
import { Icon } from '@/components/icons';

export function IngredientPriceHeaderActions({
  resetConfirm,
  resetting,
  loading,
  readOnly,
  onAskReset,
  onCancelReset,
  onConfirmReset,
  onOpenSync,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        flex: '1 1 100%',
      }}
    >
      {resetConfirm ? (
        <>
          <button className="btn" onClick={onCancelReset} disabled={resetting}>
            취소
          </button>
          <button
            className="btn"
            onClick={onConfirmReset}
            disabled={loading || resetting || readOnly}
            style={{ color: 'var(--negative)', fontWeight: 700 }}
          >
            {resetting ? '초기화 중…' : '진행하기'}
          </button>
        </>
      ) : (
        <button
          className="btn sm"
          onClick={onAskReset}
          disabled={loading || resetting || readOnly}
          style={{ color: 'var(--negative)' }}
        >
          초기화
        </button>
      )}
      <button className="btn" onClick={onOpenSync} disabled={loading || resetting || readOnly}>
        <Icon.arrowDown style={{ width: 14, height: 14 }} />
        제때 수량 동기화
      </button>
    </div>
  );
}

export function IngredientPriceEmbeddedActions({ loading, resetting, readOnly, onOpenSync }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}
    >
      <button className="btn" onClick={onOpenSync} disabled={loading || resetting || readOnly}>
        <Icon.arrowDown style={{ width: 14, height: 14 }} />
        제때 수량 동기화
      </button>
    </div>
  );
}
