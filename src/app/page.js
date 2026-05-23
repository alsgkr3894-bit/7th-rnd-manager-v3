/*
 * page.js — 임시 시작 화면
 * 디자인 토큰이 globals.css에 잘 적용되었는지 시각적으로 확인하는 placeholder.
 * 본격 작업 시작 시 Dashboard 컴포넌트로 대체 예정.
 */

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      padding: "48px",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--gap)",
    }}>
      <header>
        <h1 style={{ fontSize: 28, color: "var(--text-1)" }}>
          7번가피자 R&D 관리 플랫폼 v3
        </h1>
        <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 15 }}>
          디자인 토큰 적용 확인 화면 — 본격 작업 시 Dashboard로 대체됩니다.
        </p>
      </header>

      <section style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--pad-card)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border)",
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>색상 토큰</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { name: "--accent",    value: "#3182F6" },
            { name: "--positive",  value: "#1A8917" },
            { name: "--negative",  value: "#E03131" },
            { name: "--warn",      value: "#C76A00" },
            { name: "--text-1",    value: "#191F28" },
            { name: "--text-3",    value: "#8B95A1" },
            { name: "--border",    value: "#EBEEF1" },
            { name: "--bg",        value: "#F2F4F6" },
          ].map(t => (
            <div key={t.name} style={{
              padding: 12,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}>
              <div style={{
                width: "100%",
                height: 32,
                borderRadius: 4,
                background: `var(${t.name})`,
                marginBottom: 8,
                border: "1px solid var(--border)",
              }} />
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-2)" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--pad-card)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border)",
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>다음 단계</h2>
        <ol style={{ paddingLeft: 20, listStyle: "decimal", color: "var(--text-2)", lineHeight: 1.8 }}>
          <li>폴더 구조 셋업 (src/styles/, src/components/, src/config/ 등)</li>
          <li>공통 컴포넌트 작성 (Sidebar, TopBar, Modal, DataTable)</li>
          <li>홈 Dashboard 페이지 작성</li>
          <li>각 모듈별 페이지 점진 작업</li>
        </ol>
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-3)" }}>
          디자인 원본은 <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>v3-design-reference/</code> 폴더에 보관.
        </p>
      </section>
    </main>
  );
}
