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

  test('상한을 넘으면 남은 본문을 받지 않고 멈춘다', async () => {
    let pulled = 0;
    let cancelled = false;
    const body = new ReadableStream({
      pull(controller) {
        pulled += 1;
        if (pulled > 100) controller.close();
        else controller.enqueue(new Uint8Array(8).fill(32));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body,
      duplex: 'half',
    });

    await expect(readLimitedJson(request, 20)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThan(10);
  });

  test('조각 경계에서 잘린 한글도 그대로 읽는다', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ name: '치즈크러스트' }));
    let at = 0;
    const body = new ReadableStream({
      pull(controller) {
        if (at >= bytes.length) controller.close();
        else controller.enqueue(bytes.slice(at, (at += 1)));
      },
    });
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body,
      duplex: 'half',
    });

    await expect(readLimitedJson(request, 1000)).resolves.toEqual({ name: '치즈크러스트' });
  });

  test('상한 이내 JSON은 정상 파싱한다', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    });
    await expect(readLimitedJson(request, 100)).resolves.toEqual({ ok: true });
  });
});
