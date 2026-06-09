import { asDisplayText } from './prop-guards';

export function normalizeEmptyStateText(value) {
  return asDisplayText(value);
}

export function normalizeEmptyStateDescription(desc, sub) {
  return asDisplayText(desc) || asDisplayText(sub);
}

export function normalizeEmptyStateAction(action) {
  return asDisplayText(action);
}

export function normalizeEmptyStateOnAction(onAction) {
  return typeof onAction === 'function' ? onAction : undefined;
}

export function normalizeEmptyStateCompact(compact) {
  return Boolean(compact);
}

export function getEmptyStateContainerStyle(compact) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: normalizeEmptyStateCompact(compact) ? '32px 16px' : '48px 24px',
    color: 'var(--text-3)',
    textAlign: 'center',
    gap: 8,
  };
}

export function getEmptyStateIconStyle() {
  return { color: 'var(--text-4)' };
}

export function getEmptyStateTitleStyle() {
  return { fontSize: 14, fontWeight: 600, color: 'var(--text-2)' };
}

export function getEmptyStateDescriptionStyle() {
  return { fontSize: 12 };
}

export function getEmptyStateActionStyle() {
  return { marginTop: 8 };
}
