'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { getSampleById, updateSample, sampleNamesOf, RATING_LABELS } from '@/lib/sample';
import { SampleFormBody, SAMPLE_INIT } from '../_SampleFormBody';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';

export default function Page() {
  const router  = useRouter();
  const { id }  = useParams();
  const parsedSampleId = Number(id);
  const sampleId = Number.isSafeInteger(parsedSampleId) && parsedSampleId > 0 ? parsedSampleId : null;

  const [form,    setForm]    = useState(SAMPLE_INIT);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sampleId) { router.replace('/note/sample'); return; }
    let alive = true;
    initDB()
      .then(() => getSampleById(sampleId))
      .then(rec => {
        if (!alive) return;
        if (!rec) { showToast('샘플을 찾을 수 없어요', 'warn'); router.replace('/note/sample'); return; }
        const names = sampleNamesOf(rec);
        setForm({ ...SAMPLE_INIT, ...rec, sampleNames: names.length ? names : [''] });
      })
      .catch(err => { if (alive) console.error(err); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sampleId, router]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    const names = (form.sampleNames || []).map(s => (s || '').trim()).filter(Boolean);
    if (!form.title.trim() || !names.length) {
      showToast('제목과 샘플명은 필수입니다', 'warn');
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

  function exportSampleCsv() {
    const headers = [
      '제목', '샘플명', '카테고리', '수령일', '업체', '담당자', '평점', '단가', '부가세',
      '테스트 내용', '평가 결과', '개선사항', '다음 액션', '태그', '연결 제품', '사진 수',
    ];
    const linkedProducts = (form.linkedProducts || [])
      .map(p => `${p.kind === 'menu' ? '메뉴' : '식자재'}:${p.name || ''}${p.code ? `(${p.code})` : ''}`)
      .join(', ');
    const row = [
      form.title || '',
      sampleNamesOf(form).join(', '),
      form.category || '',
      form.testDate || '',
      form.company || '',
      form.tester || '',
      form.rating ? `${form.rating} (${RATING_LABELS[form.rating] || ''})` : '',
      form.price || '',
      form.priceTaxType === 'excl' ? '별도' : '부가세포함',
      form.description || '',
      form.result || '',
      form.improvements || '',
      form.nextAction || '',
      form.tags || '',
      linkedProducts,
      (form.photos || []).length,
    ];
    downloadCsv([headers, row], `샘플_${sampleId || 'detail'}.csv`);
  }

  async function copyReportText() {
    const lines = [
      `[샘플 보고] ${form.title || '-'}`,
      `샘플명: ${sampleNamesOf(form).join(', ') || '-'}`,
      `카테고리: ${form.category || '-'}`,
      `수령일: ${form.testDate || '-'}`,
      `업체/담당자: ${[form.company, form.tester].filter(Boolean).join(' / ') || '-'}`,
      `평점: ${form.rating ? `${form.rating}/5 ${RATING_LABELS[form.rating] || ''}` : '-'}`,
      `단가: ${form.price ? `${form.price}원 (${form.priceTaxType === 'excl' ? '별도' : '부가세포함'})` : '-'}`,
      '',
      '[테스트 내용]',
      form.description || '-',
      '',
      '[평가 결과]',
      form.result || '-',
      '',
      '[개선사항]',
      form.improvements || '-',
      '',
      '[다음 액션]',
      form.nextAction || '-',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      showToast('보고용 텍스트를 복사했어요', 'ok');
    } catch {
      showToast('복사에 실패했어요', 'error');
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
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button className="btn no-print" onClick={exportSampleCsv}>
              <Icon.download style={{ width:14, height:14 }} /> CSV
            </button>
            <button className="btn no-print" onClick={copyReportText}>
              <Icon.copy style={{ width:14, height:14 }} /> 보고용 복사
            </button>
            <button className="btn no-print" onClick={() => window.print()} title="인쇄">인쇄</button>
            <button className="btn no-print" onClick={() => router.push('/note/sample')}>취소</button>
            <button className="btn primary no-print" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </div>
        }
      />
      <SampleFormBody form={form} setForm={setForm} />
    </main>
  );
}
