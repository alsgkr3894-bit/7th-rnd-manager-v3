/**
 * app/nutrition/export/_posterPrimitives.jsx — 포스터 표 공용 셀·제목·빈 행과 열 정의
 */
import { asDisplayText } from '@/lib/ui/prop-guards';
import { nutritionValue } from '@/lib/nutrition/label/poster';

// weight 열은 한판 총중량이 아니라 환산 기준량(150g)이라 "기준중량"으로 표기한다.
export const PIZZA_150_GROUPS = [
  { label: '기준중량', key: 'weight' },
  { label: '열량(kcal/150g)', key: 'kcal' },
  { label: '단백질(g/150g)', key: 'protein' },
  { label: '포화지방(g/150g)', key: 'fat' },
  { label: '나트륨(mg/150g)', key: 'sodium' },
  { label: '당류(g/150g)', key: 'sugar' },
];

export const PIZZA_SLICE_GROUPS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '1회 조각수', key: 'servingLabel' },
  { label: '총 조각중량(g)', key: 'totalWeight' },
  { label: '열량(kcal/1회분)', key: 'kcal' },
  { label: '당류(g/1회분)', key: 'sugar' },
  { label: '단백질(g/1회분)', key: 'protein' },
  { label: '포화지방(g/1회분)', key: 'fat' },
  { label: '나트륨(mg/1회분)', key: 'sodium' },
];

export const SIMPLE_COLS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '열량(kcal/1회분)', key: 'kcal' },
  { label: '당류(g/1회분)', key: 'sugar' },
  { label: '단백질(g/1회분)', key: 'protein' },
  { label: '포화지방(g/1회분)', key: 'fat' },
  { label: '나트륨(mg/1회분)', key: 'sodium' },
];

export const BEVERAGE_COLS = [{ label: '총량(ml)', key: 'weight' }, ...SIMPLE_COLS.slice(1)];

export function CellText({ children }) {
  return <>{nutritionValue(children)}</>;
}

export function SectionTitle({ children }) {
  return <div className="nutrition-poster-section-title">{children}</div>;
}

export function EmptyRow({ colSpan, label = '데이터 없음' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="poster-empty-cell">
        {label}
      </td>
    </tr>
  );
}
