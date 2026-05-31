/**
 * lib/db/init.js — IndexedDB 초기화
 *
 * 클라이언트 사이드 전용 ('use client' 컴포넌트에서만 사용).
 * Next.js SSR에서는 indexedDB가 없으므로 호출 금지.
 *
 * v2 src/core/db.js의 initDB, _getDB 부분 이식.
 */

import { DB_NAME, DB_VERSION } from './constants';
import { createStores } from './schema/index';

let db = null;
let _initPromise = null;

/**
 * IndexedDB 초기화 (싱글톤).
 * 여러 번 호출해도 안전 — 동일 Promise 반환.
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  if (db) return Promise.resolve(db);
  if (_initPromise) return _initPromise;

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available (SSR environment)'));
  }

  _initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const idb = e.target.result;
      createStores(idb, e.oldVersion, e.target.transaction);
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      _initPromise = null;

      // 다른 탭에서 버전 업그레이드 시 자동 close + 알림
      db.onversionchange = () => {
        db.close();
        db = null;
        _initPromise = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db:version-changed'));
        }
      };

      resolve(db);
    };

    request.onerror = (e) => {
      _initPromise = null;
      console.error('[DB] 초기화 오류:', e.target.error);
      reject(e.target.error);
    };

    request.onblocked = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db:blocked'));
      }
    };
  });

  return _initPromise;
}

/**
 * 내부 사용: 초기화된 DB 인스턴스 반환.
 * @private
 */
export function _getDB() {
  if (!db) throw new Error('DB가 초기화되지 않았습니다. initDB()를 먼저 호출하세요.');
  return db;
}
