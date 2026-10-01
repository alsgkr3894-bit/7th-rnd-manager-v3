import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  StoreRowValidationError,
  normalizeStoreRowOperations,
} from '../../lib/server/store-row-sync.js';
import { hasHydratedBrand } from '../../lib/db/sync-guard.js';
import { splitOperationsForBeacon } from '../../lib/db/server-sync.js';

// 2026-09-30 전체 점검(DB 동기화·설정 영역 버그 헌트)에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('서버 오류 응답 구분', () => {
  test('잘못된 요청은 StoreRowValidationError(→ 400)로 던진다', () => {
    expect(() =>
      normalizeStoreRowOperations({ operations: [{ type: 'upsert', storeName: 'nope' }] })
    ).toThrow(StoreRowValidationError);
    expect(() => normalizeStoreRowOperations({ operations: ['x'] })).toThrow(
      StoreRowValidationError
    );
  });

  test('라우트는 검증 오류·깨진 JSON만 400, 나머지(DB 다운 등)는 503', () => {
    const route = read('app/api/db/store-rows/route.js');
    expect(route).toContain('error instanceof StoreRowValidationError ||');
    expect(route).toContain("error?.name === 'SyntaxError'");
    expect(route).toContain('status: badRequest ? 400 : 503');
  });

  test('검증 오류 외에 일반 Error를 던지는 곳이 없다(전부 400으로 새지 않게)', () => {
    expect(read('lib/server/store-row-sync.js')).not.toContain('throw new Error(');
  });
});

describe('/settings/system 하이드레이션', () => {
  test('렌더 중 getActiveBrandId()를 읽지 않고 마운트 뒤 상태로 교정한다', () => {
    const src = read('app/settings/system/page.jsx');
    expect(src).toContain('isSharedDataProtected={isSharedDataProtected}');
    expect(src).not.toContain('isSharedDataProtected={getActiveBrandId()');
    expect(src).toContain('setIsSharedDataProtected(getActiveBrandId() !== MAIN_BRAND_ID)');
  });
});

describe('동기화 가드는 그 브랜드를 불러온 기록만 인정한다', () => {
  test('같은 브랜드 성공 기록만 통과', () => {
    expect(hasHydratedBrand({ brandId: 'main', ok: true }, 'main')).toBe(true);
    expect(hasHydratedBrand({ brandId: 'main', ok: true }, 'icheon')).toBe(false);
    expect(hasHydratedBrand({ brandId: 'icheon', ok: true }, 'icheon')).toBe(true);
  });

  test('실패한 불러오기·기록 없음은 통과시키지 않는다', () => {
    expect(hasHydratedBrand({ brandId: 'main', ok: false }, 'main')).toBe(false);
    expect(hasHydratedBrand(null, 'main')).toBe(false);
  });

  test('brandId 없는 옛 기록은 main으로 본다', () => {
    expect(hasHydratedBrand({ ok: true }, 'main')).toBe(true);
    expect(hasHydratedBrand({ ok: true }, 'icheon')).toBe(false);
  });

  test('DB 재생성 때 불러온 기록도 지운다', () => {
    expect(read('app/settings/system/page.jsx')).toContain('clearHydrateJournal();');
    expect(read('lib/db/server-hydrate.js')).toContain('export function clearHydrateJournal()');
  });
});

describe('서버에서 불러오기', () => {
  test('읽기 전용 브라우저는 서버가 비운 store도 로컬에서 비운다(운영 PC는 제외)', () => {
    const src = read('lib/db/server-hydrate.js');
    expect(src).toContain('if (!isAuthoritativeClient()) {');
    expect(src).toContain('LAN_EXCLUDED_STORE_NAMES.has(storeName)');
    expect(src).toContain('targets.push({ storeName, rows: 0 })');
    // 설정·마이그레이션 표시는 서버 데이터가 아니라 브라우저 상태 — 비우면 안 된다
    expect(src).toContain("new Set(['settings', 'migration_flags'])");
    expect(src).toContain('LOCAL_STATE_STORES.has(storeName)');
  });
});

describe('브랜드 전환', () => {
  test('전환 전에 대기 중인 저장을 비우고, 다른 탭의 전환은 새로고침으로 따른다', () => {
    const src = read('hooks/useAppBrands.js');
    expect(src).toContain('await drainServerStoreSyncQueue()');
    expect(src.indexOf('await drainServerStoreSyncQueue()')).toBeLessThan(
      src.indexOf('if (!setActiveBrandId(c.id)) return;')
    );
    expect(src).toContain(
      "event.key === 'v3:active-brand' && event.newValue && event.newValue !== loadedBrandId"
    );
  });
});

describe('sendBeacon 쪼개기', () => {
  const op = bytes => ({ type: 'upsert', storeName: 's', data: { x: 'a'.repeat(bytes) } });

  test('한 번에 제한을 넘지 않게 나누고 순서·개수를 보존한다', () => {
    const ops = [op(30000), op(30000), op(30000), op(100)];
    const chunks = splitOperationsForBeacon(ops, 56 * 1024);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat()).toEqual(ops);
    for (const chunk of chunks) {
      expect(JSON.stringify({ operations: chunk }).length).toBeLessThan(64 * 1024);
    }
  });

  test('작은 큐는 한 번에', () => {
    expect(splitOperationsForBeacon([op(10), op(10)])).toHaveLength(1);
    expect(splitOperationsForBeacon([])).toEqual([]);
  });

  test('제한보다 큰 작업 하나도 버리지 않고 단독 묶음으로 둔다', () => {
    const big = op(70000);
    expect(splitOperationsForBeacon([op(10), big, op(10)]).flat()).toEqual([op(10), big, op(10)]);
  });
});

describe('읽기 전용 모드 해제', () => {
  test('운영 PC 지정은 관리자만, 확인 뒤에만', () => {
    const src = read('app/settings/sync/page.jsx');
    expect(src).toContain('관리자만 운영 PC로 지정할 수 있습니다');
    expect(src).toContain('window.confirm(');
    expect(src).toContain('useCurrentRole()');
  });
});

describe('서버 재전송 계획', () => {
  test('행 수가 같아도 키를 비교한다', () => {
    const src = read('lib/db/server-repush.js');
    expect(src).toContain('} else if (serverRows > 0) {');
    expect(src).not.toContain('serverRows !== localKeys.length');
  });
});
