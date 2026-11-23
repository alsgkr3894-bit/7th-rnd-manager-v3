export const MAX_API_BODY_BYTES = 20 * 1024 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor(limit = MAX_API_BODY_BYTES) {
    super(`Request body exceeds ${limit} bytes.`);
    this.name = 'RequestBodyTooLargeError';
    this.limit = limit;
  }
}

export function assertRequestBodyLength(request, limit = MAX_API_BODY_BYTES) {
  const raw = request.headers.get('content-length');
  if (!raw) return;
  const length = Number(raw);
  if (Number.isFinite(length) && length > limit) throw new RequestBodyTooLargeError(limit);
}

export async function readLimitedJson(request, limit = MAX_API_BODY_BYTES) {
  assertRequestBodyLength(request, limit);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > limit) throw new RequestBodyTooLargeError(limit);
  return JSON.parse(new TextDecoder().decode(bytes));
}
