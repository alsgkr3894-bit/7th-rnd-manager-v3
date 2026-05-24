'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, importAll, hasStore, ALL_STORES } from '@/lib/db';
import { readFileAsText } from '@/lib/download';
import { formatNumber } from '@/lib/format';

/**
 * 데이터 복원 페이지 — JSON 백업 업로드 + import.
 *
 * 흐름:
 *   1. 파일 선택 → 텍스트 읽기
 *   2. JSON 파싱 + 검증
 *   3. 미리보기 (store별 건수 표시)
 *   4. 사용자가 "복원 실행" 클릭
 *   5. importAll() → 기존 데이터 삭제 후 import
 */
export default function Page() {
  const [ready, setReady] = useState(false);
  const [parsed, setParsed] = useState(null);   // { version, exportedAt, stores }
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    initDB().then(() => setReady(true)).catch(err => {
      console.error('[Restore] DB 초기화 실패:', err);
      showToast('DB 초기화에 실패했습니다.', 'err');
    });
  }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsed(null);
    setConfirming(false);
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      if (!data || typeof data.stores !== 'object') {
        throw new Error('잘못된 백업 파일 형식 (stores 객체 누락)');
      }
      setParsed({ ...data, _fileName: file.name });
    } catch (err) {
      console.error('[Restore] 파일 파싱 실패:', err);
      showToast('백업 파일을 읽을 수 없습니다: ' + err.message, 'err');
    }
  }

  async function handleRestore() {
    if (!parsed || busy) return;
    setBusy(true);
    try {
      const result = await importAll(parsed);
      const { imported, skipped, errors } = result || {};

      if (errors && errors.length > 0) {
        // 부분 성공
        showToast(
          `복원 일부 완료 — 성공 ${imported}개 / 건너뜀 ${skipped}개. ` +
          `'시스템 설정 → DB 완전 재생성' 후 다시 시도하면 전체 복원됩니다.`,
          'warn'
        );
        console.warn('[Restore] 일부 실패:', errors);
      } else {
        showToast(`복원이 완료되었습니다. (${imported}개 store)`, 'ok');
      }
      setParsed(null);
      setConfirming(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('[Restore] 복원 실패:', err);
      // schema 불일치 추정 시 안내
      const isSchemaIssue = String(err.message || '').includes('object stores was not found');
      const hint = isSchemaIssue
        ? ' (해결: 시스템 설정 → 위험 영역 → "DB 완전 재생성" 후 다시 시도)'
        : '';
      showToast('복원 중 오류: ' + err.message + hint, 'err');
    } finally {
      setBusy(false);
    }
  }

  // 백업 파일에 있는 store 중 현재 DB에 없는 것 (schema 누락 추정)
  const missingStores = parsed && ready
    ? Object.keys(parsed.stores).filter(name =>
        ALL_STORES.includes(name) && !hasStore(name)
      )
    : [];

  const summary = parsed
    ? Object.entries(parsed.stores)
        .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
        .map(([name, rows]) => ({ name, count: rows.length }))
    : [];
  const totalRows = summary.reduce((s, r) => s + r.count, 0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 복원"]}
        title="데이터 복원"
        sub="JSON 백업 파일을 업로드하여 IndexedDB로 복원"
      />

      {/* 1. 파일 선택 */}
      <div className="card" style={{marginTop:24}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>1. 백업 파일 선택</h3>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={!ready || busy}
          style={{fontSize:13}}
        />
        <p style={{fontSize:12,color:'var(--text-3)',marginTop:8}}>
          이전에 다운로드한 v3 백업 JSON 파일을 선택하세요.
        </p>
      </div>

      {/* 2. 미리보기 */}
      {parsed && (
        <div className="card" style={{marginTop:16}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>2. 복원 미리보기</h3>
          <div style={{display:'flex',gap:32,marginBottom:20,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
            <div>
              <div style={{fontSize:12,color:'var(--text-3)'}}>파일</div>
              <div style={{fontWeight:600,fontSize:13,fontFamily:'monospace'}}>{parsed._fileName}</div>
            </div>
            <div>
              <div style={{fontSize:12,color:'var(--text-3)'}}>버전</div>
              <div style={{fontWeight:600,fontSize:13}}>{parsed.version || '미상'}</div>
            </div>
            {parsed.exportedAt && (
              <div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>백업 시점</div>
                <div style={{fontWeight:600,fontSize:13}}>{new Date(parsed.exportedAt).toLocaleString('ko-KR')}</div>
              </div>
            )}
            <div>
              <div style={{fontSize:12,color:'var(--text-3)'}}>총 행</div>
              <div className="num" style={{fontWeight:700,fontSize:18}}>{formatNumber(totalRows)}건</div>
            </div>
          </div>

          {summary.length === 0 ? (
            <div style={{color:'var(--text-3)',padding:'16px 0'}}>백업에 데이터가 없습니다.</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12,marginBottom:20}}>
              {summary.map(s => (
                <div key={s.name} style={{padding:12,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface-2)'}}>
                  <div style={{fontSize:12,color:'var(--text-3)',fontFamily:'monospace',marginBottom:4}}>{s.name}</div>
                  <div className="num" style={{fontSize:16,fontWeight:600}}>{formatNumber(s.count)}건</div>
                </div>
              ))}
            </div>
          )}

          {/* schema 불일치 경고 — 백업 store 일부가 DB에 없을 때 */}
          {missingStores.length > 0 && (
            <div style={{padding:16,background:'var(--warn-soft)',borderRadius:8,marginTop:12,border:'1px solid var(--warn-soft)'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <Icon.alert style={{width:16,height:16,color:'var(--warn)',marginTop:2,flex:'0 0 16px'}}/>
                <div style={{fontSize:13,color:'var(--text-1)',lineHeight:1.6,flex:1}}>
                  <b style={{color:'var(--warn)'}}>일부 store가 현재 DB에 없습니다.</b>
                  <br/>
                  <span className="num" style={{fontSize:12}}>
                    {missingStores.slice(0, 5).join(', ')}{missingStores.length > 5 ? ` 외 ${missingStores.length - 5}개` : ''}
                  </span>
                  <br/>
                  이대로 복원하면 해당 store는 건너뜁니다. 전체 복원을 원하면 먼저
                  <b> 시스템 설정 → 위험 영역 → "DB 완전 재생성" </b>
                  을 실행한 후 다시 시도하세요.
                </div>
              </div>
            </div>
          )}

          {/* 3. 복원 실행 */}
          <div style={{padding:16,background:'var(--negative-soft)',borderRadius:8,marginTop:12}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <Icon.alert style={{width:16,height:16,color:'var(--negative)',marginTop:2,flex:'0 0 16px'}}/>
              <div style={{fontSize:13,color:'var(--text-1)',lineHeight:1.6,flex:1}}>
                <b style={{color:'var(--negative)'}}>주의:</b> 복원하면 <b>현재 IndexedDB의 모든 데이터가 삭제</b>되고 백업 파일 내용으로 교체됩니다.
                <br/>실행 전에 현재 데이터를 먼저 백업하는 것을 권장합니다.
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:12,justifyContent:'flex-end'}}>
              {!confirming ? (
                <button
                  className="btn"
                  disabled={busy || summary.length === 0}
                  onClick={() => setConfirming(true)}
                  style={{color:'var(--negative)',borderColor:'var(--negative)'}}
                >
                  복원 실행
                </button>
              ) : (
                <>
                  <span style={{fontSize:13,color:'var(--negative)',fontWeight:600,marginRight:8,alignSelf:'center'}}>정말 복원할까요?</span>
                  <button className="btn" disabled={busy} onClick={() => setConfirming(false)}>취소</button>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={handleRestore}
                    style={{background:'var(--negative)'}}
                  >
                    {busy ? '복원 중…' : '정말 복원'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
