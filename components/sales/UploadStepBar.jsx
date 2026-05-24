'use client';

const STEPS = [
  { id: 'file',    label: '파일 선택' },
  { id: 'parse',   label: '검증' },
  { id: 'preview', label: '미리보기' },
  { id: 'apply',   label: '반영' },
];

/**
 * UploadStepBar — 4단계 진행 표시
 *
 * @param {'idle'|'parsing'|'preview'|'saving'|'done'} stage
 */
export function UploadStepBar({ stage }) {
  const currentIdx = stageIndex(stage);

  return (
    <div className="step-bar">
      {STEPS.map((s, i) => (
        <Step
          key={s.id}
          index={i}
          label={s.label}
          active={i === currentIdx}
          visited={i <= currentIdx}
          last={i === STEPS.length - 1}
        />
      ))}
    </div>
  );
}

function Step({ index, label, active, visited, last }) {
  return (
    <>
      <div className={'step ' + (active ? 'active ' : '') + (visited ? 'visited' : '')}>
        <div className="step-num">{index + 1}</div>
        <div className="step-label">{label}</div>
      </div>
      {!last && <div className="step-line" />}
    </>
  );
}

function stageIndex(stage) {
  switch (stage) {
    case 'idle':    return 0;
    case 'parsing': return 1;
    case 'preview': return 2;
    case 'saving':  return 3;
    case 'done':    return 3;
    default:        return 0;
  }
}
