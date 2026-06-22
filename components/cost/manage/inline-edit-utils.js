import { parseOptionalNonNegativeNumber, parseOptionalNumber } from '@/lib/parse';

export function normalizeInlineEditDraft(draft, type = 'text', options = {}) {
  if (type !== 'number') return { ok: true, value: String(draft ?? '').trim() };
  const parsed = options.nonNegative
    ? parseOptionalNonNegativeNumber(draft)
    : parseOptionalNumber(draft);
  return parsed.ok ? { ok: true, value: parsed.value } : { ok: false, value: null };
}

export function inlineEditErrorMessage({
  type = 'text',
  nonNegative = false,
  required = false,
} = {}) {
  if (required) return '필수 입력입니다';
  if (type === 'number') {
    return nonNegative ? '0 이상의 숫자만 입력하세요' : '숫자만 입력하세요';
  }
  return '입력값을 확인하세요';
}
