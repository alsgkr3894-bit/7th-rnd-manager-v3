/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */

import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';

export function RelatedSamplesPanel({ samples, menuName, onOpenSample }) {
  if (samples.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>
        관련 {SAMPLE_RECORD_LABEL}
        <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>
          제목 "{menuName}" 기준
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {samples.map(sample => (
          <RelatedSampleButton key={sample.id} sample={sample} onOpenSample={onOpenSample} />
        ))}
      </div>
    </div>
  );
}

function RelatedSampleButton({ sample, onOpenSample }) {
  return (
    <button
      onClick={() => onOpenSample(sample.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <RelatedSampleThumbnail sample={sample} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sample.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
          {sample.testDate && <span>{sample.testDate}</span>}
          {sample.rating > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--star)' }}>{'★'.repeat(sample.rating)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function RelatedSampleThumbnail({ sample }) {
  if (sample.photos?.[0]) {
    return (
      <img
        src={sample.photos[0].data}
        alt={`${sample.menuName || sample.title} 샘플 사진`}
        style={{
          width: 48,
          height: 36,
          objectFit: 'cover',
          borderRadius: 6,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 48,
        height: 36,
        borderRadius: 6,
        background: 'var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      📷
    </div>
  );
}
