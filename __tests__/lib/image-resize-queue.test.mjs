/**
 * 점검 4단계: 사진 변환은 동시에 두 장까지, 지나치게 큰 해상도는 거부, 취소 가능.
 * 어떤 실패에도 대기가 끝나고 임시 URL을 해제해야 다음 사진을 붙일 수 있다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const GLOBALS = ['File', 'Image', 'URL', 'document'];
const originals = Object.fromEntries(GLOBALS.map(name => [name, globalThis[name]]));

class TestFile {
  constructor(name, { width = 3000, height = 2000 } = {}) {
    Object.assign(this, { name, type: 'image/jpeg', size: 1000, width, height });
  }
}

let images;
let revoked;
let canvasBehaviour;
let resizePhoto;
let limits;

beforeEach(async () => {
  jest.resetModules();
  images = [];
  revoked = [];
  canvasBehaviour = {};
  const files = new Map();
  globalThis.File = TestFile;
  globalThis.URL = {
    createObjectURL: file => {
      const url = `blob:${file.name}`;
      files.set(url, file);
      return url;
    },
    revokeObjectURL: url => revoked.push(url),
  };
  globalThis.Image = class {
    set src(url) {
      const file = files.get(url);
      this.name = file.name;
      this.naturalWidth = file.width;
      this.naturalHeight = file.height;
      images.push(this);
    }
  };
  const canvases = [];
  globalThis.document = {
    createElement: () => {
      const canvas = {
        getContext: () =>
          'context' in canvasBehaviour ? canvasBehaviour.context : { drawImage: () => {} },
        toDataURL: () => {
          if (canvasBehaviour.throws) throw new Error('canvas 실패');
          return (
            canvasBehaviour.result ?? `data:image/jpeg;base64,${canvas.width}x${canvas.height}`
          );
        },
      };
      canvases.push(canvas);
      return canvas;
    },
    canvases,
  };
  limits = await import('../../lib/image/resize.js');
  resizePhoto = limits.resizePhoto;
});

afterEach(() => {
  for (const name of GLOBALS) globalThis[name] = originals[name];
  jest.useRealTimers();
});

const tick = () => new Promise(resolve => setImmediate(resolve));
const loaded = async name => {
  images.find(image => image.name === name).onload();
  await tick();
};
const started = () => images.map(image => image.name);

describe('동시 변환 제한', () => {
  test('두 장씩 시작하고 끝나는 대로 다음 장을 시작한다', async () => {
    const all = Promise.all(['a', 'b', 'c', 'd'].map(n => resizePhoto(new TestFile(n))));
    expect(started()).toEqual(['a', 'b']);

    await loaded('b');
    expect(started()).toEqual(['a', 'b', 'c']);
    await loaded('a');
    await loaded('c');
    await loaded('d');

    const result = await all;
    expect(result.map(photo => photo.name)).toEqual(['a', 'b', 'c', 'd']);
    expect(result[0].data).toBe('data:image/jpeg;base64,1400x933');
    expect(revoked).toHaveLength(4);
    // 다 쓴 캔버스는 크기를 0으로 돌려 메모리를 놓는다
    expect(globalThis.document.canvases.every(c => c.width === 0 && c.height === 0)).toBe(true);
  });
});

describe('실패해도 대기가 끝난다', () => {
  test.each([
    ['그리기 컨텍스트 없음', { context: null }, '변환하지 못했습니다'],
    ['변환 예외', { throws: true }, 'canvas 실패'],
    ['빈 결과', { result: 'data:,' }, '변환하지 못했습니다'],
  ])('%s', async (_, behaviour, message) => {
    Object.assign(canvasBehaviour, behaviour);
    const failing = resizePhoto(new TestFile('bad'));
    const expectation = expect(failing).rejects.toThrow(message);
    await loaded('bad');
    await expectation;
    expect(revoked).toEqual(['blob:bad']);

    delete canvasBehaviour.context;
    delete canvasBehaviour.throws;
    delete canvasBehaviour.result;
    const next = resizePhoto(new TestFile('next'));
    await loaded('next');
    await expect(next).resolves.toMatchObject({ name: 'next' });
  });

  test('해상도가 상한을 넘으면 그리기 전에 거부한다', async () => {
    const huge = resizePhoto(new TestFile('huge', { width: 16320, height: 12240 }));
    const expectation = expect(huge).rejects.toThrow('해상도가 너무 큽니다');
    await loaded('huge');
    await expectation;
    expect(globalThis.document.canvases).toHaveLength(0);
    expect(revoked).toEqual(['blob:huge']);
  });

  test('상한 바로 아래(6,100만 화소)는 변환한다', async () => {
    const big = resizePhoto(new TestFile('big', { width: 9504, height: 6336 }));
    await loaded('big');
    await expect(big).resolves.toMatchObject({ name: 'big' });
  });

  test('읽기가 끝나지 않으면 시간 초과로 끝내고 다음 장을 시작한다', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    const jobs = ['a', 'b', 'c'].map(n => resizePhoto(new TestFile(n)));
    const first = expect(jobs[0]).rejects.toThrow('시간이 초과');
    const second = expect(jobs[1]).rejects.toThrow('시간이 초과');

    jest.advanceTimersByTime(limits.RESIZE_TIMEOUT_MS);
    await first;
    await second;
    await tick();
    expect(started()).toEqual(['a', 'b', 'c']);
    await loaded('c');
    await expect(jobs[2]).resolves.toMatchObject({ name: 'c' });
  });
});

describe('취소', () => {
  test('진행 중인 장과 기다리는 장이 모두 끝나고, 기다리던 장은 시작하지 않는다', async () => {
    const controller = new AbortController();
    const jobs = ['a', 'b', 'c'].map(n =>
      resizePhoto(new TestFile(n), { signal: controller.signal })
    );
    const settled = Promise.allSettled(jobs);
    controller.abort();

    expect((await settled).map(r => r.reason?.name)).toEqual([
      'AbortError',
      'AbortError',
      'AbortError',
    ]);
    expect(started()).toEqual(['a', 'b']);
    expect(revoked.sort()).toEqual(['blob:a', 'blob:b']);

    await tick();
    const after = resizePhoto(new TestFile('d'));
    await loaded('d');
    await expect(after).resolves.toMatchObject({ name: 'd' });
  });

  test('이미 취소된 신호면 시작하지 않는다', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      resizePhoto(new TestFile('a'), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(started()).toEqual([]);
  });
});
