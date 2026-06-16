export function SampleDetailBody({ model }) {
  const hasDetail =
    model.description ||
    model.result ||
    model.improvements ||
    model.nextAction ||
    model.tags.length > 0;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {model.description && (
        <SampleDetailSection title="테스트 내용 / 조건">{model.description}</SampleDetailSection>
      )}
      {model.result && <SampleDetailSection title="평가 / 결과">{model.result}</SampleDetailSection>}
      {model.improvements && (
        <SampleDetailSection title="개선사항">{model.improvements}</SampleDetailSection>
      )}
      {model.nextAction && (
        <SampleDetailSection title="다음 액션">{model.nextAction}</SampleDetailSection>
      )}
      {model.tags.length > 0 && <SampleDetailTags tags={model.tags} />}
      {!hasDetail && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>상세 내용이 없습니다.</div>}
    </div>
  );
}

function SampleDetailSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>
        {title}
      </div>
      <div
        style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
      >
        {children}
      </div>
    </div>
  );
}

function SampleDetailTags({ tags }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
        태그
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {tags.map(tag => (
          <span
            key={tag}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-2)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              border: '1px solid var(--border)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
