'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/Toast';
import { copyText } from '@/lib/ui/clipboard';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  credentialSiteHref,
  getLoginCredentials,
  removeLoginCredential,
  saveLoginCredential,
} from '@/lib/rnd/login-info';

const EMPTY_FORM = {
  siteName: '',
  loginId: '',
  password: '',
  siteUrl: '',
  category: '',
  ispMemo: '',
  memo: '',
};

function mask(value) {
  return value ? '••••••••' : '-';
}

export default function LoginInfoPage() {
  const { isAdmin, ready } = useCurrentRole();
  const canEdit = ready && isAdmin;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPasswords, setShowPasswords] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      setRows(await getLoginCredentials());
    } catch (err) {
      console.error('[login-info] load failed', err);
      showToast('로그인정보를 불러오지 못했습니다', 'error');
    }
  }, []);

  useEffect(() => {
    if (ready && canEdit) load();
  }, [ready, canEdit, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      [row.siteName, row.loginId, row.siteUrl, row.category, row.ispMemo, row.memo].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [rows, search]);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!canEdit) return;
    if (!form.siteName.trim() || !form.loginId.trim()) {
      showToast('사이트명과 로그인 아이디를 입력하세요', 'warn');
      return;
    }
    try {
      await saveLoginCredential(form);
      setForm(EMPTY_FORM);
      await load();
      showToast('로그인정보를 저장했습니다', 'ok');
    } catch (err) {
      console.error('[login-info] save failed', err);
      showToast('저장 중 오류가 발생했습니다', 'error');
    }
  }

  async function copyPassword(password) {
    if (!password) return;
    if (await copyText(password)) showToast('비밀번호를 복사했습니다', 'ok');
    else showToast('복사하지 못했습니다', 'error');
  }

  async function handleDelete(id) {
    if (!canEdit) return;
    try {
      await removeLoginCredential(id);
      await load();
      showToast('로그인정보를 삭제했습니다', 'ok');
    } catch (err) {
      console.error('[login-info] delete failed', err);
      showToast('삭제에 실패했습니다: ' + (err?.message || '알 수 없는 오류'), 'error');
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['RND', '계정 로그인정보']}
        title="계정 로그인정보"
        sub={`저장 ${rows.length}건 · ISP ${rows.filter(row => row.ispMemo || row.isIsp).length}건`}
        actions={
          <button className="btn" onClick={() => setShowPasswords(value => !value)}>
            {showPasswords ? '비밀번호 숨김' : '비밀번호 표시'}
          </button>
        }
      />

      {!canEdit && ready ? (
        <section className="card" style={{ marginTop: 18 }}>
          관리자만 계정 로그인정보를 열람할 수 있습니다.
        </section>
      ) : (
        <>
          <section className="card" style={{ marginTop: 18 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              로그인정보 입력
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              <input
                className="form-input"
                value={form.siteName}
                onChange={event => update('siteName', event.target.value)}
                placeholder="사이트명"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                value={form.loginId}
                onChange={event => update('loginId', event.target.value)}
                placeholder="로그인 아이디"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={event => update('password', event.target.value)}
                placeholder="비밀번호"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                value={form.siteUrl}
                onChange={event => update('siteUrl', event.target.value)}
                placeholder="사이트 링크"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                value={form.category}
                onChange={event => update('category', event.target.value)}
                placeholder="구분"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                value={form.ispMemo}
                onChange={event => update('ispMemo', event.target.value)}
                placeholder="법인카드 결제 ISP"
                disabled={!canEdit}
              />
            </div>
            <textarea
              className="form-input"
              value={form.memo}
              onChange={event => update('memo', event.target.value)}
              placeholder="메모"
              disabled={!canEdit}
              style={{ marginTop: 10, minHeight: 64, resize: 'vertical' }}
            />
            <button className="btn primary" onClick={handleSave} disabled={!canEdit}>
              로그인정보 저장
            </button>
          </section>

          <section className="card table-card" style={{ marginTop: 18 }}>
            <div style={{ padding: 12 }}>
              <input
                className="form-input"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="사이트명, 아이디, 링크, 메모 검색"
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>사이트</th>
                    <th>아이디</th>
                    <th>비밀번호</th>
                    <th>구분</th>
                    <th>ISP</th>
                    <th>링크</th>
                    <th>메모</th>
                    <th style={{ width: 210 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8}>저장된 로그인정보가 없습니다.</td>
                    </tr>
                  ) : (
                    filtered.map(row => {
                      const siteHref = credentialSiteHref(row);
                      return (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.siteName}</strong>
                            {(row.ispMemo || row.isIsp) && (
                              <span className="chip" style={{ marginLeft: 6 }}>
                                ISP
                              </span>
                            )}
                          </td>
                          <td>{row.loginId || '-'}</td>
                          <td>{showPasswords ? row.password || '-' : mask(row.password)}</td>
                          <td>{row.category || '-'}</td>
                          <td>{row.ispMemo || (row.isIsp ? 'ISP' : '-')}</td>
                          <td>{siteHref || '-'}</td>
                          <td>{row.memo || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {siteHref ? (
                              <a
                                className="btn sm"
                                href={siteHref}
                                target="_blank"
                                rel="noreferrer"
                              >
                                사이트 연결
                              </a>
                            ) : (
                              <button className="btn sm" disabled>
                                사이트 연결
                              </button>
                            )}
                            <button className="btn sm" onClick={() => copyPassword(row.password)}>
                              비밀번호 복사
                            </button>
                            <button
                              className="btn sm"
                              onClick={() => setConfirmDelete(row)}
                              disabled={!canEdit}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="로그인정보 삭제"
        message={
          confirmDelete
            ? `'${confirmDelete.siteName || '사이트'}' 로그인정보를 삭제할까요? 되돌릴 수 없습니다.`
            : ''
        }
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          const target = confirmDelete;
          setConfirmDelete(null);
          if (target) handleDelete(target.id);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </main>
  );
}
