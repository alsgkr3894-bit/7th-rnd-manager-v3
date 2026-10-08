'use client';
import { useState, useEffect } from 'react';
import { BRAND_MASTER_EVENT, BRAND_MASTER_KEY, getVisibleBrands } from '@/lib/brand-master';
import { getActiveBrand, getActiveBrandId, setActiveBrandId } from '@/lib/active-brand';
import { COMPANIES } from '@/lib/companies';
import { drainServerStoreSyncQueue } from '@/lib/db/server-sync';
import { confirmUnsavedLeave } from '@/lib/ui/unsaved-changes';

const SSR_ACTIVE_COMPANY = COMPANIES.find(company => company.id === 'main') ||
  COMPANIES[0] || {
    id: 'main',
    name: '7번가피자',
    sub: '본사직영',
    logo: '/logo-7thstreet.png',
    color: '#E1101F',
  };
const SSR_BRAND_OPTIONS = COMPANIES.length > 0 ? COMPANIES : [SSR_ACTIVE_COMPANY];

/**
 * 활성 브랜드 색을 앱 테마(accent)에 적용.
 * 7번가(main)는 globals.css의 손튜닝 레드 테마를 사용(덮어쓰지 않음).
 */
function applyBrandAccent(company) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = ['--accent', '--accent-press', '--accent-soft', '--accent-text'];
  if (!company || company.id === 'main') {
    vars.forEach(v => root.style.removeProperty(v));
    return;
  }
  const c = company.color;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.style.setProperty('--accent', c);
  root.style.setProperty('--accent-press', `color-mix(in oklab, ${c} 82%, black)`);
  if (isDark) {
    root.style.setProperty('--accent-soft', `color-mix(in oklab, ${c} 22%, #111111)`);
    root.style.setProperty('--accent-text', `color-mix(in oklab, ${c} 55%, white)`);
  } else {
    root.style.setProperty('--accent-soft', `color-mix(in oklab, ${c} 12%, white)`);
    root.style.setProperty('--accent-text', `color-mix(in oklab, ${c} 78%, black)`);
  }
}

/**
 * 앱 전역 브랜드 상태를 관리한다.
 *
 * SSR과의 하이드레이션 불일치를 피하기 위해 첫 렌더는 상수값,
 * 마운트 후 localStorage의 실제 브랜드로 교정한다.
 *
 * @returns {{ brandOptions, activeCompany, handleCompanyChange }}
 */
export function useAppBrands() {
  const [brandOptions, setBrandOptions] = useState(SSR_BRAND_OPTIONS);
  const [activeCompany, setActiveCompany] = useState(SSR_ACTIVE_COMPANY);

  useEffect(() => {
    const syncBrands = () => {
      const visible = getVisibleBrands();
      const active = getActiveBrand();
      setBrandOptions(visible);
      setActiveCompany(active);
    };
    // 이 탭이 열릴 때의 브랜드 — 다른 탭이 바꾸면 이 탭의 이후 저장이 엉뚱한 브랜드 DB·서버 행으로
    // 들어가므로(brand는 호출마다 localStorage에서 다시 읽는다) 같이 새로고침해 맞춘다.
    const loadedBrandId = getActiveBrandId();
    const onStorage = event => {
      if (event.key === 'v3:active-brand' && event.newValue && event.newValue !== loadedBrandId) {
        window.location.reload();
        return;
      }
      if (!event.key || event.key === BRAND_MASTER_KEY || event.key === 'v3:active-brand') {
        syncBrands();
      }
    };
    syncBrands();
    window.addEventListener(BRAND_MASTER_EVENT, syncBrands);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(BRAND_MASTER_EVENT, syncBrands);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    applyBrandAccent(activeCompany);
    const obs = new MutationObserver(() => applyBrandAccent(activeCompany));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [activeCompany]);

  const handleCompanyChange = async c => {
    if (!c || c.id === getActiveBrandId()) return;
    // 브랜드를 바꾸면 페이지가 새로고침되어 작성 중이던 내용이 사라진다 — 먼저 확인
    if (!confirmUnsavedLeave()) return;
    // 대기 중인 저장을 전환 전에 서버로 비운다 — 새로고침과 함께 메모리 큐가 사라져 마지막 저장이
    // 유실되던 문제(sendBeacon은 크기 제한이 있어 믿을 수 없다). 실패해도 전환은 막지 않는다.
    try {
      await drainServerStoreSyncQueue();
    } catch (error) {
      console.warn('[brand] 전환 전 동기화 실패:', error?.message || String(error));
    }
    if (!setActiveBrandId(c.id)) return;
    window.location.reload();
  };

  return { brandOptions, activeCompany, handleCompanyChange };
}
