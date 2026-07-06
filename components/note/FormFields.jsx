import { Children, cloneElement, isValidElement, useId } from 'react';

const FIELD_CONTROL_TAGS = new Set(['input', 'select', 'textarea']);

function countNativeControls(children) {
  let count = 0;
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (FIELD_CONTROL_TAGS.has(child.type)) {
      count += 1;
      return;
    }
    if (child.props?.children) count += countNativeControls(child.props.children);
  });
  return count;
}

function attachSingleControlId(children, fallbackId) {
  if (countNativeControls(children) !== 1) return { children, controlId: null };
  let controlId = null;

  function mapChild(child) {
    if (!isValidElement(child)) return child;
    if (FIELD_CONTROL_TAGS.has(child.type)) {
      controlId = child.props.id || fallbackId;
      return child.props.id ? child : cloneElement(child, { id: controlId });
    }
    if (!child.props?.children) return child;
    return cloneElement(child, undefined, Children.map(child.props.children, mapChild));
  }

  const nextChildren = Children.map(children, mapChild);

  return { children: nextChildren, controlId };
}

export function SegGroup({ options, value, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          aria-pressed={value === o}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid',
            borderColor: value === o ? 'var(--accent)' : 'var(--border)',
            background: value === o ? 'var(--accent)' : 'var(--surface-2)',
            color: value === o ? '#fff' : 'var(--text-2)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: value === o ? 700 : 400,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.65 : 1,
          }}
          onMouseDown={event => {
            event.stopPropagation();
          }}
          onClick={event => {
            event.stopPropagation();
            if (!disabled && value !== o) onChange(o);
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, required, hint, error, children }) {
  const fallbackId = useId();
  const { children: labelledChildren, controlId } = attachSingleControlId(
    children,
    `note-field-${fallbackId}`
  );
  const LabelTag = controlId ? 'label' : 'div';

  // Segmented buttons live inside Field too, so keep this as a neutral container.
  return (
    <div style={{ display: 'block', marginBottom: 14 }}>
      <LabelTag
        htmlFor={controlId || undefined}
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: error ? 'var(--negative)' : 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>
            {hint}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>필수 항목입니다</span>
        )}
      </LabelTag>
      {error ? (
        <div style={{ outline: '1.5px solid var(--negative)', borderRadius: 8 }}>
          {labelledChildren}
        </div>
      ) : (
        labelledChildren
      )}
    </div>
  );
}
