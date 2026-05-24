// 더미 데이터 (실제 API 연동 전까지 사용)

export const MENUS_BY_PERIOD = {
  '2026.05': [
    { name: '슈퍼콤비네이션', cat: '피자',       variants: { L: 12507, R: 5290, 기타: 14653 }, costRate: 29.4, prev: 28900 },
    { name: '포테이토피자',    cat: '피자',       variants: { L: 7100,  R: 3800, 기타: 8200 },  costRate: 38.2, prev: 18100 },
    { name: '불고기피자',      cat: '피자',       variants: { L: 6280,  R: 2920, 기타: 7860 },  costRate: 28.2, prev: 17600 },
    { name: '고르곤졸라',      cat: '피자',       variants: { L: 5640,  R: 2110, 기타: 6210 },  costRate: 36.8, prev: 12480 },
    { name: '새우파티',        cat: '피자',       variants: { L: 5200,  R: 2330, 기타: 5710 },  costRate: 35.5, prev: 13780 },
    { name: '하와이안',        cat: '피자',       variants: { L: 4470,  R: 1640, 기타: 4980 },  costRate: 30.1, prev: 10470 },
    { name: '쉬림프골드',      cat: '피자',       variants: { L: 3920,  R: 1450, 기타: 4180 },  costRate: 31.7, prev: 8910  },
    { name: '치즈피자',        cat: '피자',       variants: { L: 3680,  R: 1340, 기타: 3920 },  costRate: 25.8, prev: 8740  },
    { name: '트러플 페퍼로니', cat: '피자',       variants: { L: 2410,  R: 980,  기타: 2820 },  costRate: 33.4, prev: 4980  },
    { name: '콤비 1인',        cat: '1인피자',    variants: { 단품: 2980, 세트: 1240 },          costRate: 28.6, prev: 4210  },
    { name: '포테이토 1인',    cat: '1인피자',    variants: { 단품: 1840, 세트: 920 },           costRate: 30.2, prev: 2640  },
    { name: '오븐스파게티',    cat: '사이드',     variants: { 일반: 2750 },                      costRate: 30.8, prev: 2640  },
    { name: '치즈스틱',        cat: '사이드',     variants: { 일반: 2410 },                      costRate: 24.1, prev: 2380  },
    { name: '치즈볼',          cat: '사이드',     variants: { 일반: 1840 },                      costRate: 26.5, prev: 0     },
    { name: '갈릭소스',        cat: '사이드(소스)', variants: { 일반: 4280 },                    costRate: 12.4, prev: 4100  },
    { name: '핫소스',          cat: '사이드(소스)', variants: { 일반: 3120 },                    costRate: 14.2, prev: 2980  },
    { name: '치즈크러스트',    cat: '엣지&도우',  variants: { L: 8420, R: 2010 },                costRate: 41.2, prev: 9810  },
    { name: '골드스윗크러스트',cat: '엣지&도우',  variants: { L: 5240, R: 1380 },                costRate: 43.5, prev: 6240  },
    { name: '씬도우',          cat: '엣지&도우',  variants: { L: 3210 },                         costRate: 22.8, prev: 3010  },
    { name: '패밀리 박스 L',   cat: '세트메뉴',   variants: { L: 1840 },                         costRate: 29.3, prev: 1620  },
    { name: '더블 박스',       cat: '세트메뉴',   variants: { L: 1240 },                         costRate: 31.5, prev: 1100  },
    { name: '페퍼로니 추가',   cat: '추가토핑',   variants: { 일반: 6840 },                      costRate: 18.4, prev: 6420  },
    { name: '치즈 추가',       cat: '추가토핑',   variants: { 일반: 5230 },                      costRate: 16.2, prev: 5010  },
    { name: '하프 콤비&불고기',cat: '하프앤하프', variants: { L: 1820, R: 640 },                 costRate: 30.8, prev: 2100  },
    { name: '하프 포테이토&치즈',cat:'하프앤하프',variants: { L: 1450, R: 520 },                 costRate: 32.1, prev: 1840  },
    { name: '콜라 1.25L',      cat: '음료',       variants: { 일반: 4680 },                      costRate: 35.8, prev: 4510  },
    { name: '사이다 1.25L',    cat: '음료',       variants: { 일반: 2810 },                      costRate: 36.2, prev: 2740  },
    { name: '5월 가정의 달 세트',cat:'행사',       variants: { L: 920, R: 380 },                  costRate: 34.6, prev: 0     },
    { name: '어버이날 한정',   cat: '행사',       variants: { L: 480, R: 210 },                  costRate: 36.2, prev: 0     },
  ],
};

export const RANK_CATEGORIES = [
  { id: 'all',        label: '전체',        color: '#3182F6' },
  { id: '피자',       label: '피자',        color: '#3182F6' },
  { id: '1인피자',    label: '1인피자',     color: '#10B981' },
  { id: '사이드',     label: '사이드',      color: '#F59E0B' },
  { id: '사이드(소스)',label: '사이드(소스)',color: '#EF4444' },
  { id: '엣지&도우',  label: '엣지&도우',   color: '#8B5CF6' },
  { id: '세트메뉴',   label: '세트메뉴',    color: '#EC4899' },
  { id: '추가토핑',   label: '추가토핑',    color: '#06B6D4' },
  { id: '하프앤하프', label: '하프앤하프',  color: '#84CC16' },
  { id: '음료',       label: '음료',        color: '#F97316' },
  { id: '행사',       label: '행사',        color: '#A78BFA' },
];

export const totalOf = (m) => Object.values(m.variants).reduce((s, v) => s + v, 0);

export const CHART_DATA = {
  week: {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    thisYear: [1820, 1640, 1730, 2010, 2480, 3120, 2740],
    lastYear: [1690, 1520, 1610, 1880, 2310, 2980, 2510],
  },
  month: {
    labels: ['2025.12', '2026.01', '2026.02', '2026.03', '2026.04', '2026.05'],
    thisYear: [148200, 152400, 161800, 168900, 172500, 184320],
    lastYear: [142100, 145800, 152300, 158400, 161200, 172600],
  },
};

export const DONUT_CATS = [
  { name: '피자',         value: 116720, color: '#3182F6' },
  { name: '엣지&도우',   value: 20260,  color: '#8B5CF6' },
  { name: '추가토핑',     value: 12070,  color: '#06B6D4' },
  { name: '음료',         value: 7490,   color: '#F97316' },
  { name: '사이드(소스)', value: 7400,   color: '#EF4444' },
  { name: '1인피자',      value: 6980,   color: '#10B981' },
  { name: '사이드',       value: 7000,   color: '#F59E0B' },
  { name: '하프앤하프',   value: 4430,   color: '#84CC16' },
  { name: '세트메뉴',     value: 3080,   color: '#EC4899' },
  { name: '행사',         value: 1990,   color: '#A78BFA' },
];

export const INGREDIENTS = [
  { name: '모짜렐라치즈',  unit: 'kg', price: 7680, prevPrice: 7400, supplier: '서울우유', category: '유제품' },
  { name: '고르곤졸라',    unit: 'kg', price: 42000, prevPrice: 40000, supplier: '이탈리아수입', category: '유제품' },
  { name: '새우(냉동)',    unit: 'kg', price: 18500, prevPrice: 17800, supplier: '동원수산', category: '수산' },
  { name: '토마토소스',    unit: 'kg', price: 3200, prevPrice: 3200, supplier: '청정원', category: '소스' },
  { name: '밀가루(강력)',  unit: 'kg', price: 1850, prevPrice: 1850, supplier: '대한제분', category: '곡물' },
  { name: '올리브오일',    unit: 'L',  price: 8900, prevPrice: 8900, supplier: '레스페란자', category: '오일' },
  { name: '베이컨',        unit: 'kg', price: 12400, prevPrice: 12000, supplier: '롯데햄', category: '육류' },
  { name: '양파',          unit: 'kg', price: 1990, prevPrice: 2100, supplier: '국내산', category: '채소' },
  { name: '페퍼로니',      unit: 'kg', price: 15800, prevPrice: 15800, supplier: '청정원', category: '육류' },
  { name: '파인애플(통조림)',unit: '캔', price: 4200, prevPrice: 4200, supplier: '돌코리아', category: '과일' },
];
