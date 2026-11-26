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

/**
 * 본문을 조각으로 받으며 크기를 세고, 상한을 넘는 순간 멈춘다. 전체를 받은 뒤에 검사하면
 * Content-Length가 없는 요청은 상한과 상관없이 모두 메모리에 올라간다.
 */
async function readLimitedText(request, limit) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const pieces = [];
  let received = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new RequestBodyTooLargeError(limit);
    }
    pieces.push(decoder.decode(value, { stream: true }));
  }
  pieces.push(decoder.decode());
  return pieces.join('');
}

export async function readLimitedJson(request, limit = MAX_API_BODY_BYTES) {
  assertRequestBodyLength(request, limit);
  return JSON.parse(await readLimitedText(request, limit));
}
