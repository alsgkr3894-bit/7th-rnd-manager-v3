/**
 * lib/db/init.js — IndexedDB 초기화 (멀티 브랜드)
 *
 * 클라이언트 사이드 전용 ('use client' 컴포넌트에서만 사용).
 * Next.js SSR에서는 indexedDB가 없으므로 호출 금지.
 *
 * 브랜드별로 별도 DB를 쓰므로 핸들을 DB 이름별로 캐싱한다.
 *   initDB()  → 활성 브랜드 DB (대부분의 모듈)
 *   _getDB()  → 활성 브랜드 핸들
 *   lib/db/shared.js → 노트 패밀리용 main DB 핸들(브랜드 공유)
 */

import { DB_VERSION, dbNameFor } from './constants';
import { getActiveBrandId } from '@/lib/active-brand';
import { createStores } from './schema/index';

// DB 이름 → { db, promise } 캐시
const handles = new Map();

/** 주어진 이름의 IndexedDB를 열고 핸들을 캐싱 (싱글톤/이름). */
export function openNamed(name) {
  let h = handles.get(name);
  if (h?.db) return Promise.resolve(h.db);
  if (h?.promise) return h.promise;

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available (SSR environment)'));
  }

  const promise = new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = e => {
      const idb = e.target.result;
      createStores(idb, e.oldVersion, e.target.transaction);
    };

    request.onsuccess = e => {
      const db = e.target.result;
      handles.set(name, { db, promise: null });

      // 다른 탭에서 버전 업그레이드 시 자동 close + 알림 + 캐시 무효화
      db.onversionchange = () => {
        db.close();
        handles.delete(name);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db:version-changed'));
        }
      };

      resolve(db);
    };

    request.onerror = e => {
      handles.delete(name);
      console.error(`[DB] 초기화 오류 (${name}):`, e.target.error);
      reject(e.target.error);
    };

    request.onblocked = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db:blocked'));
      }
    };
  });

  handles.set(name, { db: null, promise });
  return promise;
}

/** 동기 핸들 반환 (열려 있어야 함). */
export function getNamed(name) {
  const h = handles.get(name);
  if (!h?.db) throw new Error(`DB(${name})가 초기화되지 않았습니다. 먼저 열어야 합니다.`);
  return h.db;
}

/**
 * 활성 브랜드 DB 초기화 (싱글톤).
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  return openNamed(dbNameFor(getActiveBrandId()));
}

/**
 * 내부 사용: 활성 브랜드의 열린 DB 인스턴스 반환.
 * @private
 */
export function _getDB() {
  return getNamed(dbNameFor(getActiveBrandId()));
}
