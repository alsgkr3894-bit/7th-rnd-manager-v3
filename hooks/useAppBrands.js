'use client';
import { useState, useEffect } from 'react';
import { BRAND_MASTER_EVENT, BRAND_MASTER_KEY, getVisibleBrands } from '@/lib/brand-master';
import { getActiveBrand, getActiveBrandId, setActiveBrandId } from '@/lib/active-brand';
import { COMPANIES } from '@/lib/companies';

const SSR_ACTIVE_COMPANY =
  COMPANIES.find(company => company.id === 'main') ||
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
    const onStorage = event => {
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

  const handleCompanyChange = c => {
    if (!c || c.id === getActiveBrandId()) return;
    if (!setActiveBrandId(c.id)) return;
    window.location.reload();
  };

  return { brandOptions, activeCompany, handleCompanyChange };
}
