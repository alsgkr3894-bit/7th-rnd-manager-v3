// 메뉴개발노트 보고서 HTML 섹션 렌더러(집계표·칩·차수 카드·메뉴 카드)
import {
  isSampleRecordNote,
  noteDetailPairs,
  noteDisplayTitle,
  notePrimaryContentLabel,
} from '@/lib/note/display';
import { normalizeNoteStatus, normalizeNoteType } from '@/lib/note/constants';
import { formatNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import {
  calcReportTempCostSummary,
  cleanText,
  esc,
  parseReportTempCost,
  tempCostRowSubtotal,
  textHtml,
} from './format';

const STATUS_STYLE = {
  테스트: { bg: '#e0e7ff', color: '#3730a3' },
  테스트예정: { bg: '#fef3c7', color: '#b45309' },
  아이디어: { bg: '#f3f4f6', color: '#374151' },
  샘플테스트: { bg: '#fef3c7', color: '#b45309' },
  메뉴테스트: { bg: '#e0e7ff', color: '#3730a3' },
  테스트중: { bg: '#dcfce7', color: '#166534' },
  보류: { bg: '#f3f4f6', color: '#6b7280' },
  출시: { bg: '#dcfce7', color: '#15803d' },
  폐기: { bg: '#fee2e2', color: '#b91c1c' },
};

export function countTable(title, rows) {
  const body = rows.length
    ? rows
        .map(([label, count]) => `<tr><td>${esc(label)}</td><td class="num">${count}</td></tr>`)
        .join('')
    : '<tr><td colspan="2" class="empty">집계할 항목이 없습니다</td></tr>';
  return `<section class="count-box">
    <h2>${esc(title)}</h2>
    <table><tbody>${body}</tbody></table>
  </section>`;
}

function chip(label, className = '') {
  if (!cleanText(label)) return '';
  return `<span class="chip ${esc(className)}">${esc(label)}</span>`;
}

function statusChip(status) {
  const safeStatus = cleanText(normalizeNoteStatus(status)) || '미지정';
  const style = STATUS_STYLE[safeStatus] || STATUS_STYLE.테스트;
  return `<span class="chip" style="background:${style.bg};color:${style.color};">${esc(safeStatus)}</span>`;
}

function metaLine(note) {
  return [
    cleanText(note?.testDate) ? `테스트일 ${cleanText(note.testDate)}` : '',
    formatTestRound(note?.testRound),
    cleanText(note?.category) ? `구분 ${cleanText(note.category)}` : '',
    cleanText(note?.noteType) ? `유형 ${cleanText(normalizeNoteType(note.noteType))}` : '',
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
}

function menuMetaLine(group) {
  return [
    group.periodLabel,
    group.menuCode ? `코드 ${group.menuCode}` : '',
    `${group.notes.length}개 차수`,
    group.category ? `구분 ${group.category}` : '',
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
}

function fieldGrid(fields) {
  const filled = fields.filter(([, value]) => cleanText(value));
  if (!filled.length) return '';
  return `<div class="field-grid">${filled
    .map(
      ([label, value]) => `<section class="field">
        <h4>${esc(label)}</h4>
        <div>${textHtml(value)}</div>
      </section>`
    )
    .join('')}</div>`;
}

function photoGrid(photos) {
  const safePhotos = (Array.isArray(photos) ? photos : []).filter(photo => photo?.data);
  if (!safePhotos.length) return '';
  return `<div class="photos">${safePhotos
    .map(
      photo => `<figure>
        <img src="${esc(photo.data)}" alt="${esc(photo.caption || photo.name || '노트 사진')}">
        ${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ''}
      </figure>`
    )
    .join('')}</div>`;
}

function collectMenuPhotos(notes = []) {
  const selected = [];
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const note = notes[index] || {};
    const roundLabel = formatTestRound(note.testRound);
    const photos = (Array.isArray(note.photos) ? note.photos : []).filter(photo => photo?.data);
    for (const photo of photos) {
      selected.push({
        ...photo,
        caption: cleanText(photo.caption) || cleanText(photo.name) || roundLabel,
      });
    }
  }
  return selected;
}

function tagList(tags) {
  const items = cleanText(tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  if (!items.length) return '';
  return `<div class="tags">${items.map(tag => `<span>#${esc(tag)}</span>`).join('')}</div>`;
}

function tempCostSection(note) {
  const parsed = parseReportTempCost(note?.tempCostCalc);
  if (!parsed.rows.length) return '';
  const summary = calcReportTempCostSummary(parsed.rows, parsed.sellingPrice);
  const rows = parsed.rows
    .map(row => {
      const subtotal = tempCostRowSubtotal(row);
      return `<tr>
        <td>${esc(row.name || row.productCode || '미지정')}</td>
        <td class="num">${esc(row.quantity || '')}</td>
        <td>${esc(row.unit || '')}</td>
        <td class="num">${Number(row.unitPrice || 0).toLocaleString('ko-KR')}</td>
        <td class="num">${Math.round(subtotal).toLocaleString('ko-KR')}</td>
      </tr>`;
    })
    .join('');
  const sellingPrice = Number(parsed.sellingPrice || 0);
  const costRate =
    summary.costRate == null || !Number.isFinite(Number(summary.costRate))
      ? '—'
      : `${Number(summary.costRate).toFixed(1)}%`;

  return `<section class="temp-cost">
    <div class="temp-cost-head">
      <h4>임시 원가 계산</h4>
      <span>원가 ${Math.round(summary.totalCost).toLocaleString('ko-KR')}원 · 판매가 ${sellingPrice ? sellingPrice.toLocaleString('ko-KR') + '원' : '—'} · 원가율 ${esc(costRate)}</span>
    </div>
    <table>
      <thead><tr><th>재료</th><th class="num">수량</th><th>단위</th><th class="num">단가</th><th class="num">소계</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function roundCard(note, index, effectiveStatus) {
  const title = noteDisplayTitle(note);
  const ratingFields = NOTE_EVALUATION_FIELDS.map(item => [
    `${item.label} 별점`,
    formatNoteRating(note?.[item.key]),
  ]);
  const contentFields = isSampleRecordNote(note)
    ? [[notePrimaryContentLabel(note), note?.testContent], ...noteDetailPairs(note)]
    : [
        ...ratingFields,
        ['핵심 테스트 내용', note?.testContent],
        ['사용 재료', note?.materials],
        ['맛 평가', note?.tasteEval],
        ['상무님 평가', note?.managerEval],
        ['원가 검토', note?.costNote],
        ['이슈', note?.issues],
        ['개선점', note?.improvements],
        ['다음 액션', note?.nextAction],
      ];
  return `<section class="round-card">
    <header class="round-head">
      <div>
        <div class="note-index">${formatTestRound(note?.testRound) || `${index + 1}차`}</div>
        <h3>${esc(title)}</h3>
        <p>${metaLine(note) || '기본 정보 없음'}</p>
      </div>
      <div class="chips">
        ${statusChip(effectiveStatus || note?.status)}
        ${chip(normalizeNoteType(note?.noteType), 'type')}
      </div>
    </header>
    ${fieldGrid(contentFields)}
    ${tempCostSection(note)}
    ${tagList(note?.tags)}
  </section>`;
}

export function menuGroupCard(group, index, effectiveStatusById) {
  const effectiveStatus = effectiveStatusById.get(group.representative?.id);
  const photos = collectMenuPhotos(group.notes);
  const rounds = group.notes
    .map((note, roundIndex) => roundCard(note, roundIndex, effectiveStatusById.get(note?.id)))
    .join('');
  return `<article class="note-card">
    <header class="note-head">
      <div>
        <div class="note-index">Menu ${index + 1}</div>
        <h3>${esc(group.title)}</h3>
        <p>${menuMetaLine(group) || '기본 정보 없음'}</p>
      </div>
      <div class="chips">
        ${statusChip(effectiveStatus || group.representative?.status)}
        ${chip(formatTestRound(group.lastRoundNote?.testRound), 'type')}
      </div>
    </header>
    ${photos.length ? `<section class="menu-photos"><h4>첨부 사진</h4>${photoGrid(photos)}</section>` : ''}
    <section class="round-list">${rounds}</section>
  </article>`;
}
