'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addSample } from '@/lib/sample';
import { SampleFormBody, SAMPLE_INIT } from '../_SampleFormBody';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { KEYS } from '@/lib/note/keys';

export default function Page() {
  const router = useRouter();
  const [form,    setForm]    = useState(() => ({
    ...SAMPLE_INIT,
    testDate: new Date().toISOString().slice(0, 10),
  }));
  const [saving,  setSaving]  = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useBeforeUnload(isDirty);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEYS.SAMPLE_FROM_NOTE);
      if (raw) {
        sessionStorage.removeItem(KEYS.SAMPLE_FROM_NOTE);
        const d = JSON.parse(raw);
        setForm(f => ({
          ...f,
          sampleNames: d.menuName ? [d.menuName] : f.sampleNames,
          category:    d.category || f.category,
          tags:        d.tags     || f.tags,
        }));
      }
    } catch {}
  }, []);

  function handleFormChange(updater) {
    setForm(updater);
    setIsDirty(true);
  }

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (saving) return; // Ctrl+S 연타 시 중복 저장 방지
    const names = (form.sampleNames || []).map(s => (s || '').trim()).filter(Boolean);
    if (!form.title.trim() || !names.length) {
      showToast('제목과 샘플명은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await initDB();
      await addSample(form);
      setIsDirty(false);
      showToast('샘플이 저장됐어요', 'ok');
      router.push('/note/sample');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['샘플기록', '새 샘플 작성']}
        title="새 샘플 작성"
        sub="테스트 샘플을 사진과 함께 기록하세요"
        actions={
          <>
            <button className="btn" onClick={() => router.push('/note/sample')}>취소</button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </>
        }
      />
      <SampleFormBody form={form} setForm={handleFormChange} />
    </main>
  );
}
