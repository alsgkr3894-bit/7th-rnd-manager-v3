'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getProfile, setProfile } from '@/lib/profile';
import { PinSection } from '@/components/settings/PinSection';
import { PasswordChangeCard } from '@/components/settings/PasswordChangeCard';
import { getLastLogin, getCachedIP, fetchClientIP } from '@/lib/session';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSettingsAuth } from '@/hooks/useSettingsAuth';
import { useDBLoad } from '@/hooks/useDBLoad';
import {
  getAllAccounts,
  addAccount,
  deleteAccount,
  seedDefaultAdminIfEmpty,
  getActiveAccountId,
  setActiveAccountId,
  ROLE_LABELS,
} from '@/lib/auth/accounts';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  AccountProfileCard,
  AccountSessionCard,
  AccountMembersCard,
  AccountPermissionsMatrix,
} from './_AccountSettingsUI';

const PROFILE_FORM_DEFAULT = { name: '', email: '', team: '', role: '관리자' };

export default function Page() {
  const [profile, setProfileState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', team: '', role: '' });
  const { role: currentRole, isAdmin } = useCurrentRole();

  const [activeId, setActiveId] = useState(null);
  const { data: accountData, reload: reloadAccounts } = useDBLoad(
    async () => {
      await seedDefaultAdminIfEmpty();
      const list = await getAllAccounts();
      const storedActiveId = getActiveAccountId();
      const validActiveId = list.some(account => account.id === storedActiveId)
        ? storedActiveId
        : (list[0]?.id ?? null);
      if (validActiveId != null && validActiveId !== storedActiveId) {
        setActiveAccountId(validActiveId);
      }
      return { accounts: list, activeId: validActiveId };
    },
    { initialData: null, onError: err => console.error('[account] 계정 로드 실패', err) }
  );
  const [newAccForm, setNewAccForm] = useState({ name: '', email: '', role: 'viewer' });
  const [addingAccount, setAddingAccount] = useState(false);
  const [addingBusy, setAddingBusy] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [confirmClearPin, setConfirmClearPin] = useState(false);
  const accounts = useMemo(() => accountData?.accounts ?? [], [accountData]);
  useEffect(() => {
    if (accountData?.activeId !== undefined) setActiveId(accountData.activeId);
  }, [accountData?.activeId]);
  useEffect(() => {
    if (deleteConfirmId == null) return;
    if (!accounts.some(account => account.id === deleteConfirmId)) {
      setDeleteConfirmId(null);
    }
  }, [accounts, deleteConfirmId]);

  const { hasPin, setPin: savePin } = useSettingsAuth();
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const [lastLogin, setLastLogin] = useState(null);
  const [ipEntry, setIpEntry] = useState(null);
  const [ipLoading, setIpLoading] = useState(false);

  useEffect(() => {
    const p = getProfile();
    setProfileState(p);
    setForm(p || PROFILE_FORM_DEFAULT);
    setLastLogin(getLastLogin());
    const cached = getCachedIP();
    if (cached) setIpEntry(cached);
  }, []);

  async function handleRefreshIP() {
    setIpLoading(true);
    try {
      const entry = await fetchClientIP();
      if (entry) setIpEntry(entry);
    } finally {
      setIpLoading(false);
    }
  }

  function handleProfileFormChange(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function startEdit() {
    setForm({ ...(profile || PROFILE_FORM_DEFAULT) });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({ ...(profile || PROFILE_FORM_DEFAULT) });
  }

  function saveEdit() {
    if (!form.name?.trim()) {
      showToast('이름은 비울 수 없습니다.', 'error');
      return;
    }
    const next = setProfile({
      name: form.name.trim(),
      email: form.email?.trim() || '',
      team: form.team?.trim() || '',
      role: form.role || '관리자',
    });
    setProfileState(next);
    setEditing(false);
    showToast('프로필이 저장되었습니다.', 'ok');
  }

  function handleSetPin(e) {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('PIN은 4자리 이상이어야 합니다.');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('PIN이 일치하지 않습니다.');
      return;
    }
    setPinError('');
    const wasSet = hasPin;
    savePin(pinInput);
    setPinInput('');
    setPinConfirm('');
    showToast('PIN이 설정되었습니다.', 'ok');
    import('@/lib/work-log')
      .then(m => m.logWork('SECURITY', wasSet ? '설정 PIN 변경' : '설정 PIN 설정'))
      .catch(() => {});
  }

  function handleClearPin() {
    setConfirmClearPin(true);
  }

  function doClearPin() {
    setConfirmClearPin(false);
    savePin('');
    setPinInput('');
    setPinConfirm('');
    setPinError('');
    showToast('PIN이 해제되었습니다.', 'ok');
    import('@/lib/work-log').then(m => m.logWork('SECURITY', '설정 PIN 해제')).catch(() => {});
  }

  function handleNewAccFormChange(key, val) {
    setNewAccForm(f => ({ ...f, [key]: val }));
  }

  async function handleAddAccount() {
    if (!newAccForm.name.trim()) {
      showToast('이름을 입력하세요', 'error');
      return;
    }
    setAddingBusy(true);
    try {
      await addAccount(newAccForm);
      reloadAccounts();
      setNewAccForm({ name: '', email: '', role: 'viewer' });
      setAddingAccount(false);
      showToast('계정 추가됨', 'ok');
    } catch (err) {
      showToast('실패: ' + err.message, 'error');
    } finally {
      setAddingBusy(false);
    }
  }

  function handleSwitchAccount(acc) {
    setActiveAccountId(acc.id);
    setActiveId(acc.id);
    showToast(`${acc.name}(${ROLE_LABELS[acc.role]}) 계정으로 전환됨`, 'ok');
  }

  if (!profile) {
    return (
      <main className="main page-enter">
        <PageHeader breadcrumb={['설정 / 백업', '계정 관리']} title="계정 관리" />
        <div
          className="card"
          style={{ marginTop: 24, padding: '20px 24px', color: 'var(--text-3)' }}
        >
          프로필이 없습니다. 아래에서 설정하거나, 먼저 로그인 정보를 등록하세요.
          <div style={{ marginTop: 12 }}>
            <button
              className="btn primary sm"
              onClick={() => {
                const next = setProfile({ name: '관리자', email: '', team: '', role: '관리자' });
                setProfileState(next);
              }}
            >
              기본 프로필 생성
            </button>
          </div>
        </div>
        <PinSection
          hasPin={hasPin}
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinConfirm={pinConfirm}
          setPinConfirm={setPinConfirm}
          onSetPin={handleSetPin}
          onClearPin={handleClearPin}
        />
      </main>
    );
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '계정 관리']}
        title="계정 관리"
        sub="내 프로필 정보와 역할별 권한 기준을 확인하세요"
      />

      <PasswordChangeCard />

      <AccountProfileCard
        profile={profile}
        editing={editing}
        form={form}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onFormChange={handleProfileFormChange}
      />

      <AccountSessionCard
        lastLogin={lastLogin}
        ipEntry={ipEntry}
        ipLoading={ipLoading}
        onRefreshIP={handleRefreshIP}
      />

      <PinSection
        hasPin={hasPin}
        pinInput={pinInput}
        setPinInput={v => {
          setPinError('');
          setPinInput(v);
        }}
        pinConfirm={pinConfirm}
        setPinConfirm={v => {
          setPinError('');
          setPinConfirm(v);
        }}
        pinError={pinError}
        onSetPin={handleSetPin}
        onClearPin={handleClearPin}
      />

      <AccountMembersCard
        accounts={accounts}
        activeId={activeId}
        addingAccount={addingAccount}
        newAccForm={newAccForm}
        addingBusy={addingBusy}
        isAdmin={isAdmin}
        onToggleAdding={() => setAddingAccount(v => !v)}
        onNewAccFormChange={handleNewAccFormChange}
        onAddAccount={handleAddAccount}
        onSwitchAccount={handleSwitchAccount}
        onDeleteConfirm={setDeleteConfirmId}
      />

      <AccountPermissionsMatrix />

      {(() => {
        if (deleteConfirmId == null) return null;
        // 대상 계정이 (다른 탭/경합으로) 사라졌으면 "undefined 계정 삭제" 표시를 막고 닫는다.
        const target = accounts.find(a => a.id === deleteConfirmId);
        if (!target) return null;
        return (
          <ConfirmDialog
            open
            message={`"${target.name}" 계정을 삭제합니다. 되돌릴 수 없습니다.`}
            danger
            onConfirm={async () => {
              setDeleteConfirmId(null);
              try {
                await deleteAccount(deleteConfirmId);
                if (deleteConfirmId === activeId) {
                  const remaining = accounts.filter(a => a.id !== deleteConfirmId);
                  setActiveAccountId(remaining[0]?.id ?? null);
                }
                reloadAccounts();
                showToast('계정 삭제됨', 'ok');
              } catch (err) {
                showToast('실패: ' + err.message, 'error');
              }
            }}
            onCancel={() => setDeleteConfirmId(null)}
          />
        );
      })()}
      {confirmClearPin && (
        <ConfirmDialog
          open
          message="PIN을 해제합니다. 이후 PIN 없이 설정에 접근할 수 있습니다."
          danger
          onConfirm={doClearPin}
          onCancel={() => setConfirmClearPin(false)}
        />
      )}
    </main>
  );
}
