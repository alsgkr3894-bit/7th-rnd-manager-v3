'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
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
import { formatNumber } from '@/lib/format';
import { getSetting, setSetting } from '@/lib/settings';
import { Toggle } from '@/components/ui/Toggle';
import { useDBLoad } from '@/hooks/useDBLoad';
import {
  SettingsGroup,
  SettingsRow,
  Segmented,
  StaticValue,
  StatusValue,
  DangerConfirm,
  InfoCell,
  StorageUsageBar,
} from './_SystemSettingsUI';

/**
 * 시스템 설정 페이지
 *
 * 구성:
 *   1. 환경 설정 (다크 모드, 화면 밀도)
 *   2. 원가 계산 정책 (자동 반영 상태 / 미연동 차단 준비 상태 / 단가 1자리 정책)
 *   3. 알림 (미매칭 / 원가율 35% 초과)
 *   4. 지역 / 언어 (정보 표시, read-only)
 *   5. 앱 정보
 *   6. 저장소 상태
 *   7. 위험 영역 (모든 데이터 초기화)
 */

const APP_VERSION = '0.1.0';

const S_CARD_MT = { marginTop: 16 };
const S_CARD_TITLE = { fontSize: 15, fontWeight: 700, marginBottom: 16 };
const S_DANGER_ITEM_TITLE = { fontWeight: 700, fontSize: 14, marginBottom: 4 };
const S_DANGER_ITEM_DESC = { fontSize: 13, color: 'var(--text-2)', marginBottom: 12 };

const SETTING_KEYS = [
  'theme',
  'density',
  'fontScale',
  'autoRecalc',
  'strictPosting',
  'roundMode',
  'unmatchedAlert',
  'costRateAlert',
];

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingRecreate, setConfirmingRecreate] = useState(false);
  const [settings, setSettings] = useState(() =>
    Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)]))
  );

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

  function updateSetting(key, value, message) {
    setSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
    showToast(message, 'ok');
  }

  async function handleRecreate() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteDatabase(dbNameFor(getActiveBrandId()));
      showToast('DB 삭제 완료. 새로고침합니다…', 'ok');
      setConfirmingRecreate(false);
      // 1초 후 자동 새로고침 — 새 페이지 로드 시 최신 schema로 DB 자동 생성
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('[Recreate] 실패:', err);
      showToast('DB 재생성 실패: ' + err.message, 'error');
      setBusy(false);
    }
  }

  async function handleReset() {
    if (busy) return;
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
      setConfirmingReset(false);
      showToast('모든 데이터가 초기화되었습니다.', 'ok');
    } catch (err) {
      console.error('[Reset] 실패:', err);
      showToast('초기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const totalRows = stats ? Object.values(stats).reduce((s, n) => s + n, 0) : 0;

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

      {/* 2. 알림 (자주 ON/OFF — 환경 다음으로 자주 변경) */}
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

      {/* 3. 원가 계산 정책 (한 번 설정 후 거의 변경 없음 — 사업 정책) */}
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

      {/* 4. 지역 / 언어 (read-only 정보 표시) */}
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

      {/* 5. 앱 정보 */}
      <div className="card" style={S_CARD_MT}>
        <h2 style={S_CARD_TITLE}>앱 정보</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 24,
          }}
        >
          <InfoCell label="앱 버전" value={APP_VERSION} />
          <InfoCell label="DB 이름" value={dbNameFor(getActiveBrandId())} mono />
          <InfoCell label="DB 버전" value={String(DB_VERSION)} />
          <InfoCell label="환경" value="개발 (localhost)" />
        </div>
      </div>

      {/* 6. 저장소 상태 */}
      <div className="card" style={S_CARD_MT}>
        <h2 style={S_CARD_TITLE}>저장소 상태</h2>
        {!ready ? (
          <div style={{ color: 'var(--text-3)' }}>DB 초기화 중…</div>
        ) : (
          <>
            {/* 브라우저 용량 감지 */}
            {storageEst && <StorageUsageBar usage={storageEst.usage} quota={storageEst.quota} />}

            <div
              style={{
                display: 'flex',
                gap: 32,
                marginBottom: 20,
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
                marginTop: storageEst ? 16 : 0,
              }}
            >
              <InfoCell label="전체 저장 행" value={`${formatNumber(totalRows)}건`} big />
              <InfoCell label="정의된 store 수" value={`${ALL_STORES.length}개`} big />
              <InfoCell
                label="데이터 있는 store"
                value={`${stats ? Object.values(stats).filter(n => n > 0).length : 0}개`}
                big
              />
            </div>

            {stats && Object.values(stats).some(n => n > 0) ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                  gap: 12,
                }}
              >
                {Object.entries(stats)
                  .filter(([, n]) => n > 0)
                  .map(([name, count]) => (
                    <div
                      key={name}
                      style={{
                        padding: 12,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--surface-2)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-3)',
                          fontFamily: 'monospace',
                          marginBottom: 4,
                        }}
                      >
                        {name}
                      </div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>
                        {formatNumber(count)}건
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>
                저장된 데이터가 없습니다.
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={reloadStats} disabled={busy}>
                새로고침
              </button>
            </div>
          </>
        )}
      </div>

      {/* 7. 위험 영역 */}
      <div className="card" style={{ marginTop: 16, borderColor: 'var(--negative-soft)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--negative)' }}>
          위험 영역
        </h2>

        {/* 모든 데이터 초기화 */}
        <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={S_DANGER_ITEM_TITLE}>모든 데이터 초기화</div>
          <p style={S_DANGER_ITEM_DESC}>
            모든 store의 데이터를 삭제합니다. schema는 유지되며 빈 store로 남습니다.
            <br />
            백업이 필요한 경우 먼저 <b>데이터 백업</b> 메뉴에서 다운로드하세요.
            <br />
            초기화 후 기본 메뉴 코드를 다시 등록하려면 <b>메뉴 마스터 → 기본 코드 등록</b>을
            실행하세요.
          </p>
          <DangerConfirm
            label="모든 데이터 초기화"
            confirmMsg={`정말 모든 데이터를 삭제할까요? (${formatNumber(totalRows)}건)`}
            confirmLabel={busy ? '삭제 중…' : '정말 삭제'}
            isOpen={confirmingReset}
            onOpen={() => setConfirmingReset(true)}
            onClose={() => setConfirmingReset(false)}
            onConfirm={handleReset}
            disabled={!ready || busy || totalRows === 0}
            busy={busy}
          />
        </div>

        {/* DB 완전 재생성 */}
        <div style={{ paddingTop: 16 }}>
          <div style={S_DANGER_ITEM_TITLE}>DB 완전 재생성</div>
          <p style={S_DANGER_ITEM_DESC}>
            DB 자체를 삭제하고 최신 schema로 새로 생성합니다.
            <br />
            schema 업그레이드가 누락된 경우(<code>NotFoundError</code>) 해결 가능.
            <br />
            실행 후 페이지가 자동 새로고침되며 모든 데이터는 사라집니다.
          </p>
          <DangerConfirm
            label="DB 완전 재생성"
            confirmMsg="DB를 삭제하고 새로 만들까요? (모든 데이터 사라짐)"
            confirmLabel={busy ? '재생성 중…' : '정말 재생성'}
            isOpen={confirmingRecreate}
            onOpen={() => setConfirmingRecreate(true)}
            onClose={() => setConfirmingRecreate(false)}
            onConfirm={handleRecreate}
            disabled={!ready || busy}
            busy={busy}
          />
        </div>
      </div>
    </main>
  );
}

