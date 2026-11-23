import { describe, expect, test } from '@jest/globals';
import {
  assertRequestBodyLength,
  readLimitedJson,
  RequestBodyTooLargeError,
} from '@/lib/server/request-body-limit';

describe('API 요청 본문 크기 제한', () => {
  test('Content-Length가 상한을 넘으면 본문을 읽기 전에 거부한다', () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-length': '101' },
      body: '{}',
    });
    expect(() => assertRequestBodyLength(request, 100)).toThrow(RequestBodyTooLargeError);
  });

  test('Content-Length가 없어도 실제 본문이 상한을 넘으면 거부한다', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ value: '1234567890' }),
    });
    await expect(readLimitedJson(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  test('상한 이내 JSON은 정상 파싱한다', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    });
    await expect(readLimitedJson(request, 100)).resolves.toEqual({ ok: true });
  });
});
