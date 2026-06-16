'use client';
import { Icon } from '@/components/icons';
import { FeeRow } from '../FeeRow';

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-3)',
        marginBottom: 6,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DefaultPlatformMessage() {
  return (
    <div
      style={{
        paddingTop: 40,
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
      }}
    >
      기본은 수수료 없이 판매가 그대로 마진을 계산합니다.
    </div>
  );
}

export function PlatformEditorPanel({
  platform,
  onNameChange,
  onAddFee,
  onPatchFee,
  onSizeOverride,
  onDeleteFee,
  onDeletePlatform,
}) {
  const fees = Array.isArray(platform?.fees) ? platform.fees : [];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {!platform ? null : platform.id === 'default' ? (
        <DefaultPlatformMessage />
      ) : (
        <>
          <div>
            <SectionLabel>플랫폼명</SectionLabel>
            <input
              className="form-input"
              value={platform.name}
              onChange={event => onNameChange(event.target.value)}
              placeholder="예) 쿠팡이츠"
              style={{ maxWidth: 220 }}
            />
          </div>

          <div>
            <SectionLabel style={{ marginBottom: 10 }}>수수료 항목</SectionLabel>

            {fees.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>
                항목을 추가하세요.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {fees.map((fee, index) => (
                <FeeRow
                  key={fee.id}
                  f={fee}
                  isLast={index === fees.length - 1}
                  onPatch={patch => onPatchFee(fee.id, patch)}
                  onSizeOverride={(key, value) => onSizeOverride(fee.id, key, value)}
                  onDelete={() => onDeleteFee(fee.id)}
                />
              ))}
            </div>

            <button
              type="button"
              className="btn sm"
              onClick={onAddFee}
              style={{ fontSize: 11, marginTop: 10 }}
            >
              <Icon.plus style={{ width: 11, height: 11 }} /> 항목 추가
            </button>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--divider)',
            }}
          >
            <button
              type="button"
              className="btn sm"
              onClick={() => onDeletePlatform(platform.id)}
              style={{ fontSize: 11, color: 'var(--negative)' }}
            >
              <Icon.trash style={{ width: 11, height: 11 }} /> 이 플랫폼 삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
