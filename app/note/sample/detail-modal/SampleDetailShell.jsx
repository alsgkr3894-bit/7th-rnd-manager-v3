export function SampleDetailShell({ containerRef, isClosing, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fade 150ms ease',
      }}
    >
      <div
        ref={containerRef}
        className={'modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
