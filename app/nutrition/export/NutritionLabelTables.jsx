/* eslint-disable react/no-unescaped-entities */
import { LABEL_COLS } from '@/lib/nutrition/label/build';
import { PizzaNutritionTable } from './label-tables/PizzaNutritionTable';
import { PizzaSliceNutritionTable } from './label-tables/PizzaSliceNutritionTable';
import { SetHalfNutritionTable } from './label-tables/SetHalfNutritionTable';
import { SimpleNutritionTable } from './label-tables/SimpleNutritionTable';
import { NutritionPosterBoard } from './NutritionPosterBoard';

const BEVERAGE_COLS = LABEL_COLS.map(column =>
  column.key === 'weight' ? { ...column, label: '용량', unit: 'ml' } : column
);

export function NutritionLabelTabContent({
  tab,
  pizzaView,
  pizzaSheet,
  pizzaSliceSheet,
  toppingSheet,
  sideSheet,
  setHalfSheet,
  beverageSheet,
  originStatementSheet,
}) {
  if (tab === 'poster') {
    return (
      <NutritionPosterBoard
        pizzaSheet={pizzaSheet}
        pizzaSliceSheet={pizzaSliceSheet}
        toppingSheet={toppingSheet}
        sideSheet={sideSheet}
        setHalfSheet={setHalfSheet}
        beverageSheet={beverageSheet}
        originStatementSheet={originStatementSheet}
      />
    );
  }
  if (tab === 'pizza') {
    return pizzaView === 'slice' ? (
      <PizzaSliceNutritionTable rows={pizzaSliceSheet} />
    ) : (
      <PizzaNutritionTable rows={pizzaSheet} />
    );
  }
  if (tab === 'topping') return <SimpleNutritionTable title="추가토핑" rows={toppingSheet} />;
  if (tab === 'side') return <SimpleNutritionTable title="사이드·파스타" rows={sideSheet} />;
  if (tab === 'set') return <SetHalfNutritionTable rows={setHalfSheet} />;
  if (tab === 'drink')
    return <SimpleNutritionTable title="음료" rows={beverageSheet} cols={BEVERAGE_COLS} />;
  return null;
}
