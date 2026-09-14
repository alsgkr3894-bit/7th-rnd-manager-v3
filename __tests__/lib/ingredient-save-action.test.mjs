import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const addIngredient = jest.fn().mockResolvedValue(undefined);
const updateIngredient = jest.fn().mockResolvedValue(undefined);
const upsertIngredientMeta = jest.fn().mockResolvedValue(undefined);
const replaceIngredientProductCode = jest.fn();
const showToast = jest.fn();
const syncManagedScope = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('@/lib/ingredient', () => ({
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  replaceIngredientProductCode,
}));
jest.unstable_mockModule('@/components/Toast', () => ({ showToast }));
jest.unstable_mockModule('@/lib/change-log', () => ({ logIngredientSave: jest.fn() }));
jest.unstable_mockModule('../../app/ingredient/manage/ingredientManageUtils.js', () => ({
  syncManagedScope,
}));

const { saveIngredientAndReplace } =
  await import('../../app/ingredient/manage/useIngredientSaveAction.js');

describe('saveIngredientAndReplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    replaceIngredientProductCode.mockResolvedValue({
      menuRecipeUpdated: 2,
      recipeGroupUpdated: 1,
      edgeUpdated: 0,
    });
  });

  test('formTarget이 manual이면 updateIngredient 호출 후 replacement 없이 종료한다', async () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const setFormTarget = jest.fn();

    await saveIngredientAndReplace({
      formData: { ingredientName: '식자재' },
      saveOptions: { replacement: null },
      canEdit: true,
      formTarget: { isManual: true, id: 1, productCode: '' },
      setFormTarget,
      load,
    });

    expect(updateIngredient).toHaveBeenCalledWith(1, { ingredientName: '식자재' });
    expect(replaceIngredientProductCode).not.toHaveBeenCalled();
    expect(setFormTarget).toHaveBeenCalledWith(null);
    expect(load).toHaveBeenCalled();
  });

  test('replacement이 있으면 저장 후 replaceIngredientProductCode까지 실행한다', async () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const setFormTarget = jest.fn();

    await saveIngredientAndReplace({
      formData: { productCode: 'OLD01' },
      saveOptions: { replacement: { productCode: 'NEW01', ingredientName: '새제품' } },
      canEdit: true,
      formTarget: { isManual: false, productCode: 'OLD01' },
      setFormTarget,
      load,
    });

    expect(upsertIngredientMeta).toHaveBeenCalled();
    expect(replaceIngredientProductCode).toHaveBeenCalledWith('OLD01', {
      productCode: 'NEW01',
      ingredientName: '새제품',
    });
    expect(setFormTarget).toHaveBeenCalledWith(null);
  });

  test('대체 연결이 실패하면 모달을 닫지 않고 에러 토스트만 띄운다', async () => {
    replaceIngredientProductCode.mockRejectedValue(new Error('이미 단종된 제품'));
    const load = jest.fn().mockResolvedValue(undefined);
    const setFormTarget = jest.fn();

    await saveIngredientAndReplace({
      formData: { productCode: 'OLD01' },
      saveOptions: { replacement: { productCode: 'NEW01', ingredientName: '새제품' } },
      canEdit: true,
      formTarget: { isManual: false, productCode: 'OLD01' },
      setFormTarget,
      load,
    });

    expect(setFormTarget).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('식자재는 저장됐지만 대체 연결 실패'),
      'error'
    );
    // 대체 연결 실패해도 목록은 새로고침해 최신 단종 상태를 보여준다
    expect(load).toHaveBeenCalled();
  });

  test('canEdit이 false면 아무것도 호출하지 않는다', async () => {
    const load = jest.fn();
    const setFormTarget = jest.fn();

    await saveIngredientAndReplace({
      formData: { ingredientName: 'x' },
      saveOptions: {},
      canEdit: false,
      formTarget: 'new',
      setFormTarget,
      load,
    });

    expect(addIngredient).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  test('신규 등록(formTarget "new")은 addIngredient를 호출한다', async () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const setFormTarget = jest.fn();

    await saveIngredientAndReplace({
      formData: { ingredientName: '새 식자재' },
      saveOptions: {},
      canEdit: true,
      formTarget: 'new',
      setFormTarget,
      load,
    });

    expect(addIngredient).toHaveBeenCalledWith({ ingredientName: '새 식자재' });
    expect(setFormTarget).toHaveBeenCalledWith(null);
  });
});
