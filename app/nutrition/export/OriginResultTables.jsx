import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildOriginStatementLines,
  buildPizzaCommonSpans,
} from '@/lib/nutrition/origin/output-sheets';

const EMPTY_SET = new Set();
const asSet = value => (value instanceof Set ? value : EMPTY_SET);
const NOTICE = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

export function OriginResultSheetContent({ tab, sheet1, sheet2, sheet3, sheet4 }) {
  if (tab === 'store') return <Sheet1 rows={sheet1} />;
  if (tab === 'fridge') return <Sheet2 rows={sheet2} />;
  if (tab === 'delivery') return <Sheet3 rows={sheet3} />;
  if (tab === 'statement') return <Sheet4 rows={sheet4} />;
  return null;
}

function Sheet1({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) {
    return (
      <div className="origin-result-empty">
        원산지 데이터가 없습니다. 식자재 관리에서 원산지를 입력해주세요.
      </div>
    );
  }

  // 연속된 "피자공통" 행은 메뉴명 칸을 세로로 합친다 (양식의 치즈·도우 행)
  const spanStart = new Map();
  const spanned = new Set();
  for (const span of buildPizzaCommonSpans(safeRows)) {
    spanStart.set(span.start, span.length);
    for (let i = span.start + 1; i < span.start + span.length; i++) spanned.add(i);
  }

  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판</div>
      <table className="origin-result-table origin-sign-table">
        <colgroup>
          <col className="col-item" />
          <col className="col-origin" />
          <col className="col-menu" />
        </colgroup>
        <thead>
          <tr>
            <th>표시품목</th>
            <th>원산지</th>
            <th>메뉴명</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr
              key={`${asDisplayText(row.displayName)}-${asDisplayText(row.originCountry)}-${index}`}
            >
              <td>{asDisplayText(row.displayName)}</td>
              <td>{asDisplayText(row.originCountry)}</td>
              {!spanned.has(index) && (
                <td rowSpan={spanStart.get(index) || undefined}>
                  {Array.isArray(row.menus)
                    ? row.menus.join(', ')
                    : [...asSet(row.menus)].join(', ')}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet2({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;

  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판</div>
      <table className="origin-result-table origin-fridge-table">
        <colgroup>
          <col className="col-food" />
          <col className="col-item" />
          <col className="col-origin" />
        </colgroup>
        <thead>
          <tr>
            <th>음식명</th>
            <th>표시품목</th>
            <th>원산지</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={`${asDisplayText(row.ingredientName)}-${index}`}>
              <td>{asDisplayText(row.ingredientName)}</td>
              <td>{asDisplayText(row.itemText)}</td>
              <td>{asDisplayText(row.originText)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet3({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;

  return (
    <div id="origin-print-area">
      <div className="origin-result-title">배달플랫폼 원산지 표기</div>
      <table className="origin-result-table origin-delivery-table">
        <colgroup>
          <col style={{ width: '90px' }} />
          <col className="col-menu" />
          <col className="col-ing" />
        </colgroup>
        <thead>
          <tr>
            <th>구분</th>
            <th>메뉴명</th>
            <th>재료명(원산지)</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={`${asDisplayText(row.menuCode) || asDisplayText(row.menuName)}-${index}`}>
              <td style={{ fontWeight: 700, textAlign: 'center' }}>{asDisplayText(row.group)}</td>
              <td style={{ fontWeight: 600 }}>{asDisplayText(row.menuName)}</td>
              <td>
                {Array.isArray(row.parts)
                  ? row.parts.map(part => asDisplayText(part)).join(', ')
                  : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice">{NOTICE}</div>
    </div>
  );
}

function Sheet4({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;

  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지</div>
      <div className="origin-statement-box">
        {buildOriginStatementLines(safeRows).map((line, index) => (
          <p className="origin-statement-line" key={index}>
            {line || ' '}
          </p>
        ))}
      </div>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}
