import { Check, OptGroup } from '@/components/report/ReportBuilderShell';

export function CostReportOptions({
  cats,
  onCatChange,
  opts,
  onOptionChange,
  riskThreshold,
  onRiskThreshold,
  docFormat,
  onFormatChange,
}) {
  return (
    <>
      <OptGroup label="포함 카테고리" hint="체크된 카테고리만 종합 원가표에 포함돼요">
        <Check label="피자" value={cats.pizza} onChange={value => onCatChange('pizza', value)} />
        <Check
          label="1인피자"
          value={cats.personal}
          onChange={value => onCatChange('personal', value)}
        />
        <Check label="세트박스" value={cats.set} onChange={value => onCatChange('set', value)} />
        <Check label="사이드" value={cats.side} onChange={value => onCatChange('side', value)} />
        <Check
          label="엣지 & 도우"
          value={cats.edge}
          onChange={value => onCatChange('edge', value)}
        />
      </OptGroup>

      <OptGroup label="피자 옵션">
        <Check
          label="피자 원가에 기본 엣지 포함"
          value={opts.includeEdge}
          onChange={value => onOptionChange('includeEdge', value)}
          hint="석쇠 기준 엣지 원가를 피자 원가에 합산합니다"
        />
      </OptGroup>

      <OptGroup label="위험 메뉴 기준" hint="이 원가율을 초과하는 메뉴는 ⚠ 표시">
        <div className="threshold-bar">
          <input
            type="range"
            min="25"
            max="50"
            step="1"
            value={riskThreshold}
            onChange={event => onRiskThreshold(parseInt(event.target.value, 10))}
          />
          <div className="threshold-val num" style={{ minWidth: 64, color: 'var(--warn)' }}>
            {riskThreshold}
            <span className="unit">%↑</span>
          </div>
        </div>
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check
          label="요약 (평균 원가율·위험 메뉴 수)"
          value={opts.summary}
          onChange={value => onOptionChange('summary', value)}
        />
        <Check
          label="카테고리별 종합 비교표"
          value={opts.catTable}
          onChange={value => onOptionChange('catTable', value)}
        />
        <Check
          label="카테고리별 메뉴 전체"
          value={opts.perCategory}
          onChange={value => onOptionChange('perCategory', value)}
        />
        <Check
          label="위험 메뉴 부록 (원가율 높은 순)"
          value={opts.riskList}
          onChange={value => onOptionChange('riskList', value)}
        />
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF" value={docFormat.pdf} onChange={value => onFormatChange('pdf', value)} />
        <Check
          label="Excel (.xlsx)"
          value={docFormat.excel}
          onChange={value => onFormatChange('excel', value)}
        />
      </OptGroup>
    </>
  );
}
