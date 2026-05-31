'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getSampleById, updateSample } from '@/lib/sample';
import { SampleFormBody, SAMPLE_INIT } from '../_SampleFormBody';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';

export default function Page() {
  const router  = useRouter();
  const { id }  = useParams();
  const sampleId = id ? Number(id) : null;

  const [form,    setForm]    = useState(SAMPLE_INIT);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sampleId) { router.replace('/note/sample'); return; }
    initDB()
      .then(() => getSampleById(sampleId))
      .then(rec => {
        if (!rec) { showToast('샘플을 찾을 수 없어요', 'warn'); router.replace('/note/sample'); return; }
        setForm({ ...SAMPLE_INIT, ...rec });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sampleId, router]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (!form.title.trim() || !form.menuName.trim()) {
      showToast('제목과 메뉴명은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await updateSample(sampleId, form);
      showToast('샘플이 수정됐어요', 'ok');
      router.push('/note/sample');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  if (loading) return (
    <main className="main">
      <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>불러오는 중…</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['샘플기록', '샘플 수정']}
        title="샘플 수정"
        sub={form.title || ''}
        actions={
          <>
            <button className="btn no-print" onClick={() => window.print()} title="인쇄">🖨</button>
            <button className="btn no-print" onClick={() => router.push('/note/sample')}>취소</button>
            <button className="btn primary no-print" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </>
        }
      />
      <SampleFormBody form={form} setForm={setForm} />
    </main>
  );
}
