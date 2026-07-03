'use client';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { SHORTCUTS, shortcutMacKey, shortcutWindowsKey } from '@/components/ShortcutsHelp';
import {
  clearStore,
  ALL_STORES,
  DB_VERSION,
  hasStore,
  deleteDatabase,
  collectStoreStats,
} from '@/lib/db';
import { dbNameFor } from '@/lib/db/constants';
import { getActiveBrandId } from '@/lib/active-brand';
import { getSetting, getSettingDefault, setSetting } from '@/lib/settings';
import { Toggle } from '@/components/ui/Toggle';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { assertActiveAdmin } from '@/lib/auth/guard';
import {
  SettingsGroup,
  SettingsRow,
  Segmented,
  StaticValue,
  StatusValue,
  SystemAppInfoCard,
  SystemStorageStatusCard,
  SystemDangerZoneCard,
} from './_SystemSettingsUI';

const APP_VERSION = '0.1.0';

const SETTING_KEYS = [
  'theme',
  'density',
  'fontScale',
  'keyboardShortcuts',
  'autoRecalc',
  'strictPosting',
  'roundMode',
  'unmatchedAlert',
  'costRateAlert',
];

export default function Page() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const [busy, setBusy] = useState(false);
  const reloadTimerRef = useRef(null);
  const [settings, setSettings] = useState(() =>
    Object.fromEntries(SETTING_KEYS.map(k => [k, getSettingDefault(k)]))
  );
  const [dbName, setDbName] = useState(() => dbNameFor('main'));

  useEffect(() => () => clearTimeout(reloadTimerRef.current), []);

  useEffect(() => {
    setSettings(Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)])));
    setDbName(dbNameFor(getActiveBrandId()));
  }, []);

  const { data: statsData, reload: reloadStats } = useDBLoad(
    async () => {
      const stats = await collectStoreStats();
      let storageEst = null;
      if (navigator.storage?.estimate) {
        storageEst = await navigator.storage.estimate().catch(() => null);
      }
      return { stats, storageEst };
    },
    {
      initialData: null,
      onError: err => {
        console.error('[Settings/System] 통계 로드 실패:', err);
        showToast('저장소 통계를 불러오지 못했습니다.', 'error');
      },
    }
  );

  const stats = statsData?.stats ?? null;
  const storageEst = statsData?.storageEst ?? null;
  const ready = statsData !== null;
  const totalRows = stats ? Object.values(stats).reduce((s, n) => s + n, 0) : 0;

  function updateSetting(key, value, message) {
    setSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
    showToast(message, 'ok');
  }

  function scheduleReload(delayMs) {
    clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      window.location.reload();
    }, delayMs);
  }

  async function handleRecreate() {
    if (busy) return;
    try {
      await assertActiveAdmin('DB 재생성');
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
    setBusy(true);
    try {
      await deleteDatabase(dbNameFor(getActiveBrandId()));
      showToast('DB 삭제 완료. 새로고침합니다…', 'ok');
      scheduleReload(1000);
    } catch (err) {
      console.error('[Recreate] 실패:', err);
      showToast('DB 재생성 실패: ' + err.message, 'error');
      setBusy(false);
    }
  }

  async function handleReset() {
    if (busy) return;
    try {
      await assertActiveAdmin('전체 초기화');
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
    setBusy(true);
    try {
      for (const name of ALL_STORES) {
        if (!hasStore(name)) continue;
        try {
          await clearStore(name);
        } catch (err) {
          console.warn(`[Reset] ${name} skip:`, err);
        }
      }
      reloadStats();
      showToast('모든 데이터가 초기화되었습니다.', 'ok');
    } catch (err) {
      console.error('[Reset] 실패:', err);
      showToast('초기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '시스템 설정']}
        title="시스템 설정"
        sub="환경, 원가 정책, 알림 등을 관리하세요. 변경은 즉시 적용됩니다."
      />

      {/* 1. 환경 설정 */}
      <SettingsGroup title="환경 설정" style={{ marginTop: 24 }}>
        <SettingsRow
          name="다크 모드"
          desc="어두운 배경으로 전환합니다"
          control={
            <Toggle
              value={settings.theme === 'dark'}
              onChange={on =>
                updateSetting('theme', on ? 'dark' : 'light', '다크 모드 ' + (on ? '설정' : '해제'))
              }
            />
          }
        />
        <SettingsRow
          name="화면 밀도"
          desc="표·카드 간격을 조절합니다"
          control={
            <Segmented
              value={settings.density}
              options={[
                { value: 'normal', label: '기본' },
                { value: 'compact', label: '촘촘' },
              ]}
              onChange={v =>
                updateSetting('density', v, v === 'compact' ? '촘촘 밀도 적용' : '기본 밀도 적용')
              }
            />
          }
        />
        <SettingsRow
          name="글씨 크기"
          desc="표·제목·버튼 등 글자 크기를 키웁니다 (레이아웃은 유지)"
          control={
            <Segmented
              value={settings.fontScale}
              options={[
                { value: 'normal', label: '보통' },
                { value: 'large', label: '크게' },
                { value: 'xlarge', label: '더 크게' },
              ]}
              onChange={v =>
                updateSetting(
                  'fontScale',
                  v,
                  { normal: '보통', large: '크게', xlarge: '더 크게' }[v] + ' 글씨 적용'
                )
              }
            />
          }
          last
        />
      </SettingsGroup>

      {/* 2. 단축키 */}
      <SettingsGroup title="단축키">
        <SettingsRow
          name="키보드 단축키 사용"
          desc="전역 이동, 검색 포커스, 커맨드 팔레트, 작성 화면 저장 단축키를 켜거나 끕니다."
          control={
            <Toggle
              value={settings.keyboardShortcuts === 'on'}
              onChange={on =>
                updateSetting(
                  'keyboardShortcuts',
                  on ? 'on' : 'off',
                  '키보드 단축키 ' + (on ? 'ON' : 'OFF')
                )
              }
            />
          }
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 8,
            paddingTop: 12,
          }}
        >
          {SHORTCUTS.map(shortcut => (
            <div
              key={shortcut.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {shortcut.desc}
                </div>
                {shortcut.requiresEdit && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    관리자 권한 필요
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', justifyItems: 'end', gap: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700 }}>
                  Windows
                </span>
                <kbd
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 7,
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-1)',
                    fontFamily: 'inherit',
                  }}
                >
                  {shortcutWindowsKey(shortcut)}
                </kbd>
                {shortcutMacKey(shortcut) !== shortcutWindowsKey(shortcut) && (
                  <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
                    Mac {shortcutMacKey(shortcut)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SettingsGroup>

      {/* 3. 알림 */}
      <SettingsGroup title="알림">
        <SettingsRow
          name="미매칭 메뉴 알림"
          desc="판매량 업로드 후 매칭되지 않은 메뉴가 있으면 홈에 알림을 표시합니다."
          control={
            <Toggle
              value={settings.unmatchedAlert === 'on'}
              onChange={on =>
                updateSetting(
                  'unmatchedAlert',
                  on ? 'on' : 'off',
                  '미매칭 알림 ' + (on ? 'ON' : 'OFF')
                )
              }
            />
          }
        />
        <SettingsRow
          name="원가율 35% 초과 알림"
          desc="재계산 후 원가율 35% 초과 메뉴가 새로 생기면 빨간 알림을 표시합니다."
          control={
            <Toggle
              value={settings.costRateAlert === 'on'}
              onChange={on =>
                updateSetting(
                  'costRateAlert',
                  on ? 'on' : 'off',
                  '원가율 알림 ' + (on ? 'ON' : 'OFF')
                )
              }
            />
          }
          last
        />
      </SettingsGroup>

      {/* 4. 원가 계산 정책 */}
      <SettingsGroup title="원가 계산 정책">
        <SettingsRow
          name="단가 변경 시 원가 화면 자동 반영"
          desc="제때 단가 업로드/삭제 이벤트가 열린 원가 화면을 최신 단가로 갱신합니다."
          control={<StatusValue tone="ok">항상 자동 반영</StatusValue>}
        />
        <SettingsRow
          name="미연동 재료 차단"
          desc="단가가 없는 레시피 구성품이 있으면 원가 보고서 생성을 차단합니다."
          control={
            <Toggle
              value={settings.strictPosting === 'on'}
              onChange={on =>
                updateSetting(
                  'strictPosting',
                  on ? 'on' : 'off',
                  '미연동 재료 차단 ' + (on ? 'ON' : 'OFF')
                )
              }
            />
          }
        />
        <SettingsRow
          name="단가 환산 자리수"
          desc="g·개당 단가는 소수점 1자리 반올림으로 고정합니다."
          control={<StatusValue>1자리 반올림</StatusValue>}
          last
        />
      </SettingsGroup>

      {/* 5. 지역 / 언어 */}
      <SettingsGroup title="지역 / 언어">
        <SettingsRow
          name="언어"
          desc="UI 텍스트 표시 언어 (현재 한국어 고정)"
          control={<StaticValue>한국어</StaticValue>}
        />
        <SettingsRow
          name="시간대"
          desc="모든 일시 표시·자동 작업의 기준 시간대"
          control={<StaticValue>Asia/Seoul (KST · UTC+9)</StaticValue>}
        />
        <SettingsRow
          name="통화"
          desc="원가·판매가·매출 표시 통화"
          control={<StaticValue>원 (KRW)</StaticValue>}
          last
        />
      </SettingsGroup>

      <SystemAppInfoCard
        appVersion={APP_VERSION}
        dbName={dbName}
        dbVersion={String(DB_VERSION)}
        roleReady={roleReady}
        isAdmin={isAdmin}
      />

      <SystemStorageStatusCard
        ready={ready}
        stats={stats}
        storageEst={storageEst}
        totalStoreCount={ALL_STORES.length}
        totalRows={totalRows}
        busy={busy}
        onReload={reloadStats}
      />

      <SystemDangerZoneCard
        ready={ready}
        busy={busy}
        roleReady={roleReady}
        isAdmin={isAdmin}
        totalRows={totalRows}
        onReset={handleReset}
        onRecreate={handleRecreate}
      />
    </main>
  );
}
