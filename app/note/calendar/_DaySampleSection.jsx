'use client';
import { RATING_COLOR, sampleNamesText } from '@/lib/sample';
import { asDisplayText, clampInteger } from '@/lib/ui/prop-guards';

export function DaySampleSection({ samples, onOpen }) {
  if (samples.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 6,
        }}
      >
        샘플 수령 · {samples.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {samples.map((sample, i) => (
          <SampleItem
            key={asDisplayText(sample.id) || `sample-${i}`}
            sample={sample}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function SampleItem({ sample, onOpen }) {
  const sampleId = asDisplayText(sample.id);
  const names = sampleNamesText(sample);
  const title = asDisplayText(sample.title) || names || '(제목 없음)';
  const company = asDisplayText(sample.company);
  const rating = clampInteger(sample.rating, { min: 0, max: 5, fallback: 0 });

  return (
    <button
      onClick={() => {
        if (sampleId) onOpen(sampleId);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 12px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        font: 'inherit',
        background: 'var(--surface-2)',
        textAlign: 'left',
        width: '100%',
        borderLeft: `3px solid ${RATING_COLOR?.[rating] || 'var(--positive)'}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>
        {title}
      </div>
      {names && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{names}</div>}
      {company && <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{company}</div>}
    </button>
  );
}
